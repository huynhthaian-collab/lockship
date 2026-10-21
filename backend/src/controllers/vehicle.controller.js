import * as vehicleService from "../services/vehicle.service.js";
import { sendSuccess } from "../utils/api-response.js";

export async function listVehicles(req, res) {
    const vehicles = await vehicleService.listVehicles(req.user.role, req.user.id);
    return sendSuccess(res, { message: "Vehicles retrieved successfully.", data: { vehicles } });
}

export async function createVehicle(req, res) {
    const vehicle = await vehicleService.createVehicle(req.user.id, req.body);
    return sendSuccess(res, {
        statusCode: 201,
        message: "Vehicle created successfully.",
        data: { vehicle },
    });
}

export async function getVehicle(req, res) {
    const vehicle = await vehicleService.getVehicle(req.user.role, req.user.id, req.params.id);
    return sendSuccess(res, { message: "Vehicle retrieved successfully.", data: { vehicle } });
}

export async function updateVehicle(req, res) {
    const vehicle = await vehicleService.updateVehicle(
        req.user.role,
        req.user.id,
        req.params.id,
        req.body,
    );
    return sendSuccess(res, { message: "Vehicle updated successfully.", data: { vehicle } });
}

export async function removeVehicle(req, res) {
    await vehicleService.removeVehicle(req.user.role, req.user.id, req.params.id);
    return sendSuccess(res, { message: "Vehicle removed successfully." });
}