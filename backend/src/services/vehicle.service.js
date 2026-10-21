import mongoose from "mongoose";
import User from "../models/user.model.js";
import Vehicle from "../models/vehicle.model.js";
import AppError from "../utils/app-error.js";

const editableFields = ["plateNumber", "type", "model", "iotDeviceId", "status"];

function getVehicleScope(role, userId) {
    if (role === "owner") {
        return { ownerId: userId };
    }
    if (role === "admin") {
        return {};
    }

    throw new AppError("You do not have permission to manage vehicles.", 403);
}

function validateVehicleId(vehicleId) {
    if (!mongoose.isValidObjectId(vehicleId)) {
        throw new AppError("The supplied vehicle ID is invalid.", 400);
    }
}

async function getActiveOwner(ownerId) {
    if (!mongoose.isValidObjectId(ownerId)) {
        throw new AppError("A valid owner ID is required.", 422);
    }

    const owner = await User.findOne({ _id: ownerId, role: "owner", status: "active" });
    if (!owner) {
        throw new AppError("An active owner with this ID was not found.", 422);
    }
}

export async function listVehicles(role, userId) {
    const scope = getVehicleScope(role, userId);
    return Vehicle.find(scope).sort({ createdAt: -1 });
}

export async function getVehicle(role, userId, vehicleId) {
    validateVehicleId(vehicleId);
    const scope = getVehicleScope(role, userId);
    const vehicle = await Vehicle.findOne({ _id: vehicleId, ...scope });
    if (!vehicle) {
        throw new AppError("Vehicle was not found.", 404);
    }

    return vehicle;
}

export async function createVehicle(ownerId, vehicleData) {
    return Vehicle.create({ ...vehicleData, ownerId });
}

export async function updateVehicle(role, userId, vehicleId, updates) {
    const vehicle = await getVehicle(role, userId, vehicleId);

    for (const field of editableFields) {
        if (Object.hasOwn(updates, field)) {
            vehicle[field] = updates[field];
        }
    }

    if (role === "admin" && Object.hasOwn(updates, "ownerId")) {
        await getActiveOwner(updates.ownerId);
        vehicle.ownerId = updates.ownerId;
    }

    await vehicle.save();
    return vehicle;
}

export async function removeVehicle(role, userId, vehicleId) {
    const vehicle = await getVehicle(role, userId, vehicleId);
    await vehicle.deleteOne();
}