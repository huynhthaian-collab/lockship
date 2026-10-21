import * as deliveryService from "../services/delivery.service.js";
import { sendSuccess } from "../utils/api-response.js";

export async function listDeliveries(req, res) {
    const deliveries = await deliveryService.listDeliveries(req.user.role, req.user.id);
    return sendSuccess(res, { message: "Deliveries retrieved successfully.", data: { deliveries } });
}

export async function createDelivery(req, res) {
    const delivery = await deliveryService.createDelivery(req.user.id, req.body);
    return sendSuccess(res, {
        statusCode: 201,
        message: "Delivery created successfully.",
        data: { delivery },
    });
}

export async function getDelivery(req, res) {
    const delivery = await deliveryService.getDelivery(req.user.role, req.user.id, req.params.id);
    return sendSuccess(res, { message: "Delivery retrieved successfully.", data: { delivery } });
}

export async function updateDelivery(req, res) {
    const delivery = await deliveryService.updateDelivery(req.user.id, req.params.id, req.body);
    return sendSuccess(res, { message: "Delivery updated successfully.", data: { delivery } });
}

export async function assignDelivery(req, res) {
    const delivery = await deliveryService.assignDelivery(
        req.user.id,
        req.params.id,
        req.body.shipperId,
        req.body.vehicleId,
    );
    return sendSuccess(res, { message: "Shipper assigned successfully.", data: { delivery } });
}

export async function acceptDelivery(req, res) {
    const delivery = await deliveryService.acceptDelivery(req.user.id, req.params.id);
    return sendSuccess(res, { message: "Delivery accepted successfully.", data: { delivery } });
}

export async function startDelivery(req, res) {
    const delivery = await deliveryService.startDelivery(req.user.id, req.params.id);
    return sendSuccess(res, { message: "Delivery started successfully.", data: { delivery } });
}

export async function arriveAtDestination(req, res) {
    const delivery = await deliveryService.arriveAtDestination(req.user.id, req.params.id);
    return sendSuccess(res, { message: "Arrival recorded successfully.", data: { delivery } });
}

export async function authorizeDelivery(req, res) {
    const { delivery, expiresAt } = await deliveryService.authorizeDelivery(req.user.id, req.params.id);
    return sendSuccess(res, {
        message: "Delivery authorized and unlock code sent to the assigned shipper.",
        data: { delivery, codeExpiresAt: expiresAt },
    });
}

export async function getUnlockCode(req, res) {
    const unlockCode = await deliveryService.getDeliveryUnlockCode(req.user.id, req.params.id);
    res.set("Cache-Control", "no-store");
    return sendSuccess(res, {
        message: "Active unlock code retrieved successfully.",
        data: { unlockCode },
    });
}

export async function unlockDelivery(req, res) {
    const result = await deliveryService.unlockDelivery(req.user.id, req.params.id, req.body.code);
    return sendSuccess(res, {
        message: "Unlock code verified; waiting for IoT device result.",
        data: result,
    });
}

export async function completeDelivery(req, res) {
    const delivery = await deliveryService.completeDelivery(req.user.id, req.params.id);
    return sendSuccess(res, { message: "Delivery completed successfully.", data: { delivery } });
}

export async function cancelDelivery(req, res) {
    const delivery = await deliveryService.cancelDelivery(req.user.id, req.params.id);
    return sendSuccess(res, { message: "Delivery cancelled successfully.", data: { delivery } });
}

export async function listDeliveryIssues(req, res) {
    const issues = await deliveryService.listDeliveryIssues(req.user.role, req.user.id);
    return sendSuccess(res, { message: "Delivery reports retrieved successfully.", data: { issues } });
}

export async function reportDeliveryProblem(req, res) {
    const issue = await deliveryService.reportDeliveryProblem(req.user.id, req.params.id, req.body);
    return sendSuccess(res, {
        statusCode: 201,
        message: "Delivery problem reported to the owner.",
        data: { issue },
    });
}