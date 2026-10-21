import * as iotDeviceService from "../services/iot-device.service.js";
import { sendSuccess } from "../utils/api-response.js";

export async function listDevices(req, res) {
    const devices = await iotDeviceService.listDevices(req.user.role, req.user.id);
    return sendSuccess(res, { message: "IoT devices retrieved successfully.", data: { devices } });
}

export async function createDevice(req, res) {
    const { device, deviceToken } = await iotDeviceService.createDevice(req.user.role, req.user.id, req.body);
    return sendSuccess(res, {
        statusCode: 201,
        message: "IoT device registered. Store its provisioning token securely; it will not be shown again.",
        data: { device, deviceToken },
    });
}

export async function getDevice(req, res) {
    const device = await iotDeviceService.getDevice(req.user.role, req.user.id, req.params.id);
    return sendSuccess(res, { message: "IoT device retrieved successfully.", data: { device } });
}

export async function updateDevice(req, res) {
    const device = await iotDeviceService.updateDevice(req.user.role, req.user.id, req.params.id, req.body);
    return sendSuccess(res, { message: "IoT device updated successfully.", data: { device } });
}

export async function deleteDevice(req, res) {
    await iotDeviceService.deleteDevice(req.user.role, req.user.id, req.params.id);
    return sendSuccess(res, { message: "IoT device deleted successfully." });
}

export async function getDeviceStatus(req, res) {
    const status = await iotDeviceService.getDeviceStatus(req.user.role, req.user.id, req.params.id);
    return sendSuccess(res, { message: "IoT device status retrieved successfully.", data: { status } });
}

export async function getDeviceLogs(req, res) {
    const logs = await iotDeviceService.listDeviceLogs(req.user.role, req.user.id, req.params.id);
    return sendSuccess(res, { message: "IoT device logs retrieved successfully.", data: { logs } });
}

export async function publishCommand(req, res) {
    const result = await iotDeviceService.publishUserCommand(
        req.user.role,
        req.user.id,
        req.params.id,
        req.body.command,
    );
    return sendSuccess(res, { message: "IoT command published successfully.", data: result });
}