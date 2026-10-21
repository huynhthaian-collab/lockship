import * as userService from "../services/user.service.js";
import { sendSuccess } from "../utils/api-response.js";

export async function listOwnerShippers(req, res) {
    const users = await userService.listOwnerShippers(req.user.id);
    return sendSuccess(res, { message: "Shippers retrieved successfully.", data: { users } });
}

export async function getOwnerShipper(req, res) {
    const user = await userService.getOwnerShipper(req.user.id, req.params.userId);
    return sendSuccess(res, { message: "Shipper retrieved successfully.", data: { user } });
}

export async function createOwnerShipper(req, res) {
    const user = await userService.createOwnerShipper(req.user.id, req.body);
    return sendSuccess(res, { statusCode: 201, message: "Shipper created successfully.", data: { user } });
}

export async function updateOwnerShipper(req, res) {
    const user = await userService.updateOwnerShipper(req.user.id, req.params.userId, req.body);
    return sendSuccess(res, { message: "Shipper updated successfully.", data: { user } });
}

export async function removeOwnerShipper(req, res) {
    await userService.removeOwnerShipper(req.user.id, req.params.userId);
    return sendSuccess(res, { message: "Shipper removed successfully." });
}

export async function listUsers(_req, res) {
    const users = await userService.listUsers();
    return sendSuccess(res, { message: "Users retrieved successfully.", data: { users } });
}

export async function getUser(req, res) {
    const user = await userService.getUser(req.params.userId);
    return sendSuccess(res, { message: "User retrieved successfully.", data: { user } });
}

export async function createUser(req, res) {
    const user = await userService.createUser(req.body);
    return sendSuccess(res, { statusCode: 201, message: "User created successfully.", data: { user } });
}

export async function updateUser(req, res) {
    const user = await userService.updateUser(req.params.userId, req.body);
    return sendSuccess(res, { message: "User updated successfully.", data: { user } });
}

export async function deleteUser(req, res) {
    await userService.deleteUser(req.user.id, req.params.userId);
    return sendSuccess(res, { message: "User deleted successfully." });
}

export async function updateUserStatus(req, res) {
    const user = await userService.updateUserStatus(req.user.id, req.params.userId, req.body.status);
    return sendSuccess(res, { message: "User status updated successfully.", data: { user } });
}

export async function updateUserRole(req, res) {
    const user = await userService.updateUserRole(req.user.id, req.params.userId, req.body.role, req.body.ownerId);
    return sendSuccess(res, { message: "User role updated successfully.", data: { user } });
}