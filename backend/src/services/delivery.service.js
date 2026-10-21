import mongoose from "mongoose";
import Delivery from "../models/delivery.model.js";
import DeliveryIssue from "../models/delivery-issue.model.js";
import User from "../models/user.model.js";
import Vehicle from "../models/vehicle.model.js";
import AppError from "../utils/app-error.js";
import { createDeliveryArrivedNotification, createNotification, createUnlockCodeNotification } from "./notification.service.js";
import { getActiveUnlockCode, issueUnlockCode, verifyUnlockCode } from "./unlock-code.service.js";
import { emitToUser } from "./socket.service.js";

const editableFields = ["pickupAddress", "deliveryAddress", "description"];

function emitDeliveryArrived(delivery) {
    emitToUser(delivery.ownerId, "delivery:arrived", {
        deliveryId: delivery.id,
        shipperId: delivery.shipperId,
        vehicleId: delivery.vehicleId,
        pickupAddress: delivery.pickupAddress,
        deliveryAddress: delivery.deliveryAddress,
        status: delivery.status,
        arrivedAt: delivery.arrivedAt,
    });
}

function validateDeliveryId(deliveryId) {
    if (!mongoose.isValidObjectId(deliveryId)) {
        throw new AppError("The supplied delivery ID is invalid.", 400);
    }
}

function getDeliveryScope(role, userId) {
    if (role === "owner") {
        return { ownerId: userId };
    }
    if (role === "shipper") {
        return { shipperId: userId };
    }
    if (role === "admin") {
        return {};
    }

    throw new AppError("You do not have permission to access deliveries.", 403);
}

async function transitionDelivery({ deliveryId, scope, allowedStatuses, nextStatus, timestamps = {}, conditions = {} }) {
    validateDeliveryId(deliveryId);

    const delivery = await Delivery.findOneAndUpdate(
        { _id: deliveryId, ...scope, ...conditions, status: { $in: allowedStatuses } },
        { $set: { status: nextStatus, ...timestamps } },
        { new: true, runValidators: true },
    );
    if (delivery) {
        return delivery;
    }

    const existingDelivery = await Delivery.findOne({ _id: deliveryId, ...scope }).select("status");
    if (!existingDelivery) {
        throw new AppError("Delivery was not found.", 404);
    }

    throw new AppError(
        `Delivery cannot transition from ${existingDelivery.status} to ${nextStatus}.`,
        409,
    );
}

export async function listDeliveries(role, userId) {
    const scope = getDeliveryScope(role, userId);
    return Delivery.find(scope).sort({ createdAt: -1 });
}

export async function getDelivery(role, userId, deliveryId) {
    validateDeliveryId(deliveryId);
    const scope = getDeliveryScope(role, userId);
    const delivery = await Delivery.findOne({ _id: deliveryId, ...scope });
    if (!delivery) {
        throw new AppError("Delivery was not found.", 404);
    }

    return delivery;
}

export async function createDelivery(ownerId, input) {
    return Delivery.create({ ...input, ownerId, status: "pending" });
}

export async function updateDelivery(ownerId, deliveryId, updates) {
    validateDeliveryId(deliveryId);
    const changes = {};
    for (const field of editableFields) {
        if (Object.hasOwn(updates, field)) {
            changes[field] = updates[field];
        }
    }

    const delivery = await Delivery.findOneAndUpdate(
        { _id: deliveryId, ownerId, status: "pending" },
        { $set: changes },
        { new: true, runValidators: true },
    );
    if (delivery) {
        return delivery;
    }

    const existingDelivery = await Delivery.findOne({ _id: deliveryId, ownerId }).select("status");
    if (!existingDelivery) {
        throw new AppError("Delivery was not found.", 404);
    }
    throw new AppError("Only pending deliveries can be edited.", 409);
}

export async function assignDelivery(ownerId, deliveryId, shipperId, vehicleId) {
    validateDeliveryId(deliveryId);
    if (!mongoose.isValidObjectId(shipperId) || !mongoose.isValidObjectId(vehicleId)) {
        throw new AppError("Valid shipper and vehicle IDs are required.", 422);
    }

    const shipper = await User.findOne({
        _id: shipperId,
        ownerId,
        role: "shipper",
        status: "active",
    });
    if (!shipper) {
        throw new AppError("An active shipper managed by this owner is required.", 422);
    }

    const vehicle = await Vehicle.findOne({ _id: vehicleId, ownerId, status: "active" });
    if (!vehicle) {
        throw new AppError("An active vehicle owned by this owner is required.", 422);
    }

    return transitionDelivery({
        deliveryId,
        scope: { ownerId },
        allowedStatuses: ["pending", "assigned"],
        nextStatus: "assigned",
        timestamps: { shipperId, vehicleId },
    });
}

export async function acceptDelivery(shipperId, deliveryId) {
    return transitionDelivery({
        deliveryId,
        scope: { shipperId },
        allowedStatuses: ["assigned"],
        nextStatus: "accepted",
    });
}

export async function startDelivery(shipperId, deliveryId) {
    return transitionDelivery({
        deliveryId,
        scope: { shipperId },
        allowedStatuses: ["accepted"],
        nextStatus: "in-progress",
    });
}

export async function arriveAtDestination(shipperId, deliveryId) {
    try {
        const delivery = await transitionDelivery({
            deliveryId,
            scope: { shipperId },
            allowedStatuses: ["in-progress"],
            nextStatus: "arrived",
            timestamps: { arrivedAt: new Date() },
        });
        await createDeliveryArrivedNotification(delivery);
        emitDeliveryArrived(delivery);
        return delivery;
    } catch (error) {
        if (error.statusCode !== 409) {
            throw error;
        }

        const alreadyArrived = await Delivery.findOne({
            _id: deliveryId,
            shipperId,
            status: "arrived",
        });
        if (!alreadyArrived) {
            throw error;
        }

        await createDeliveryArrivedNotification(alreadyArrived);
        emitDeliveryArrived(alreadyArrived);
        return alreadyArrived;
    }
}

export async function authorizeDelivery(ownerId, deliveryId) {
    validateDeliveryId(deliveryId);
    let delivery = await Delivery.findOne({ _id: deliveryId, ownerId });
    if (!delivery) {
        throw new AppError("Delivery was not found.", 404);
    }
    if (!["arrived", "authorized"].includes(delivery.status)) {
        throw new AppError(`Delivery cannot be authorized from ${delivery.status}.`, 409);
    }
    if (!delivery.shipperId) {
        throw new AppError("Delivery must have an assigned shipper before authorization.", 409);
    }

    const shipper = await User.findOne({
        _id: delivery.shipperId,
        role: "shipper",
        status: "active",
    }).select("email");
    if (!shipper) {
        throw new AppError("An active assigned shipper is required to issue an unlock code.", 409);
    }

    if (delivery.status === "arrived") {
        const authorizedDelivery = await Delivery.findOneAndUpdate(
            { _id: deliveryId, ownerId, status: "arrived" },
            { $set: { status: "authorized", authorizedAt: new Date() } },
            { new: true, runValidators: true },
        );

        if (authorizedDelivery) {
            delivery = authorizedDelivery;
        } else {
            delivery = await Delivery.findOne({ _id: deliveryId, ownerId, status: "authorized" });
            if (!delivery) {
                throw new AppError("Delivery state changed before authorization.", 409);
            }
        }
    }

    const { expiresAt } = await issueUnlockCode(delivery, shipper.email);
    await createUnlockCodeNotification(delivery, expiresAt);
    emitToUser(delivery.shipperId, "delivery:authorized", {
        deliveryId: delivery.id,
        status: "authorized",
        authorizedAt: delivery.authorizedAt,
        unlockExpiresAt: expiresAt.toISOString(),
    });
    emitToUser(delivery.shipperId, "unlock-code:created", {
        deliveryId: delivery.id,
        status: "active",
        expiresAt: expiresAt.toISOString(),
    });
    return { delivery, expiresAt };
}

export async function getDeliveryUnlockCode(shipperId, deliveryId) {
    validateDeliveryId(deliveryId);
    return getActiveUnlockCode(shipperId, deliveryId);
}

export async function unlockDelivery(shipperId, deliveryId, code) {
    validateDeliveryId(deliveryId);
    return verifyUnlockCode(shipperId, deliveryId, code);
}

export async function completeDelivery(shipperId, deliveryId) {
    validateDeliveryId(deliveryId);
    const delivery = await Delivery.findOne({ _id: deliveryId, shipperId });
    if (!delivery) {
        throw new AppError("Delivery was not found.", 404);
    }
    if (delivery.status !== "authorized") {
        throw new AppError("Delivery is not authorized for completion.", 409, null, "DELIVERY_NOT_AUTHORIZED");
    }
    if (delivery.unlockStatus !== "succeeded") {
        const errorCode = delivery.unlockStatus === "failed" ? "DEVICE_UNLOCK_FAILED" : "DEVICE_UNLOCK_PENDING";
        throw new AppError("The IoT device must confirm a successful unlock before completion.", 409, null, errorCode);
    }

    return transitionDelivery({
        deliveryId,
        scope: { shipperId },
        allowedStatuses: ["authorized"],
        nextStatus: "completed",
        timestamps: { completedAt: new Date() },
        conditions: { unlockStatus: "succeeded" },
    });
}

export async function cancelDelivery(ownerId, deliveryId) {
    return transitionDelivery({
        deliveryId,
        scope: { ownerId },
        allowedStatuses: ["pending", "assigned", "accepted"],
        nextStatus: "cancelled",
    });
}

export async function listDeliveryIssues(role, userId) {
    const scope = role === "owner" ? { ownerId: userId } : role === "shipper" ? { shipperId: userId } : role === "admin" ? {} : null;
    if (!scope) {
        throw new AppError("You do not have permission to view delivery reports.", 403);
    }
    return DeliveryIssue.find(scope).sort({ createdAt: -1 });
}

export async function reportDeliveryProblem(shipperId, deliveryId, { category, description }) {
    validateDeliveryId(deliveryId);
    const delivery = await Delivery.findOne({ _id: deliveryId, shipperId });
    if (!delivery) {
        throw new AppError("Delivery was not found in your assigned deliveries.", 404);
    }
    if (["completed", "cancelled"].includes(delivery.status)) {
        throw new AppError("A problem cannot be reported for a closed delivery.", 409);
    }

    const issue = await DeliveryIssue.create({
        deliveryId: delivery._id,
        ownerId: delivery.ownerId,
        shipperId,
        category,
        description,
    });
    await createNotification({
        userId: delivery.ownerId,
        type: "delivery_problem_reported",
        title: "Shipper reported a delivery problem",
        message: `A problem was reported for delivery ${delivery.id} (${category}).`,
        deliveryId: delivery._id,
    });

    return issue;
}