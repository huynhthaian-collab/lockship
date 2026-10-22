import mongoose from "mongoose";
import User from "../models/user.model.js";
import AppError from "../utils/app-error.js";
import { disconnectUserSockets } from "./socket.service.js";

const profileFields = ["name", "email", "phone", "address", "avatar"];

function applyProfile(user, profile) {
    for (const field of profileFields) {
        if (Object.hasOwn(profile, field)) {
            user[field] = profile[field];
        }
    }
}

async function requireActiveOwner(ownerId) {
    const owner = await User.findOne({ _id: ownerId, role: "owner", status: "active" });
    if (!owner) {
        throw new AppError("An active owner with this ID was not found.", 422);
    }
}

async function findOwnedShipper(ownerId, userId) {
    if (!mongoose.isValidObjectId(userId)) {
        throw new AppError("The supplied user ID is invalid.", 400);
    }

    const shipper = await User.findOne({ _id: userId, role: "shipper", ownerId });
    if (!shipper) {
        throw new AppError("Shipper was not found in your managed scope.", 404);
    }

    return shipper;
}

export async function listOwnerShippers(ownerId) {
    return User.find({ role: "shipper", ownerId }).sort({ createdAt: -1 });
}

export async function getOwnerShipper(ownerId, userId) {
    return findOwnedShipper(ownerId, userId);
}

export async function createOwnerShipper(ownerId, input) {
    return User.create({ ...input, role: "shipper", ownerId });
}

export async function updateOwnerShipper(ownerId, userId, profile) {
    const shipper = await findOwnedShipper(ownerId, userId);
    applyProfile(shipper, profile);
    await shipper.save();
    return shipper;
}

export async function removeOwnerShipper(ownerId, userId) {
    const shipper = await findOwnedShipper(ownerId, userId);
    await shipper.deleteOne();
    disconnectUserSockets(userId);
}

export async function listUsers() {
    return User.find().sort({ createdAt: -1 });
}

export async function getUser(userId) {
    if (!mongoose.isValidObjectId(userId)) {
        throw new AppError("The supplied user ID is invalid.", 400);
    }

    const user = await User.findById(userId).select("+tokenVersion");
    if (!user) {
        throw new AppError("User was not found.", 404);
    }

    return user;
}

export async function createUser(input) {
    const { ownerId, ...userData } = input;
    if (ownerId && userData.role !== "shipper") {
        throw new AppError("Only shippers can be assigned to an owner.", 422);
    }
    if (ownerId) {
        await requireActiveOwner(ownerId);
    }

    return User.create({ ...userData, ownerId: ownerId ?? null });
}

export async function updateUser(actorIdOrUserId, userIdOrProfile, maybeProfile) {
    let actorId, userId, profile;
    if (maybeProfile !== undefined) {
        actorId = actorIdOrUserId;
        userId = userIdOrProfile;
        profile = maybeProfile;
    } else {
        userId = actorIdOrUserId;
        profile = userIdOrProfile;
        actorId = null;
    }

    const user = await getUser(userId);

    // Admin Protection:
    if (user.role?.toLowerCase() === "admin") {
        if (actorId && String(actorId) !== String(user.id || user._id)) {
            throw new AppError("Không thể chỉnh sửa, vô hiệu hóa hoặc xóa tài khoản Quản trị viên (Admin) khác.", 403);
        }
        if (profile.role && profile.role.toLowerCase() !== "admin") {
            throw new AppError("Bạn không thể tự hạ quyền hoặc thay đổi vai trò tài khoản Quản trị viên của chính mình.", 403);
        }
        if (profile.status && profile.status !== "active") {
            throw new AppError("Bạn không thể tự thay đổi trạng thái hoặc vô hiệu hóa tài khoản Quản trị viên của chính mình.", 403);
        }
        if (profile.isActive === false) {
            throw new AppError("Bạn không thể tự thay đổi trạng thái hoặc vô hiệu hóa tài khoản Quản trị viên của chính mình.", 403);
        }
    }

    applyProfile(user, profile);
    await user.save();
    return user;
}

export async function deleteUser(actorId, userId) {
    const user = await getUser(userId);
    if (actorId && String(user.id || user._id) === String(actorId)) {
        throw new AppError("Bạn không thể tự xóa tài khoản Quản trị viên của chính mình.", 403);
    }
    if (user.role?.toLowerCase() === "admin") {
        throw new AppError("Không thể chỉnh sửa, vô hiệu hóa hoặc xóa tài khoản Quản trị viên (Admin) khác.", 403);
    }

    if (user.role === "owner") {
        await User.updateMany({ ownerId: user._id }, { $set: { ownerId: null } });
    }

    await user.deleteOne();
    disconnectUserSockets(userId);
}

export async function updateUserStatus(actorId, userId, status) {
    const user = await getUser(userId);
    if (actorId && String(user.id || user._id) === String(actorId)) {
        throw new AppError("Bạn không thể tự thay đổi trạng thái hoặc vô hiệu hóa tài khoản Quản trị viên của chính mình.", 403);
    }
    if (user.role?.toLowerCase() === "admin") {
        throw new AppError("Không thể chỉnh sửa, vô hiệu hóa hoặc xóa tài khoản Quản trị viên (Admin) khác.", 403);
    }

    user.status = status;
    user.tokenVersion += 1;
    await user.save();
    disconnectUserSockets(userId);
    return user;
}

export async function updateUserRole(actorId, userId, role, ownerId) {
    const user = await getUser(userId);
    if (actorId && String(user.id || user._id) === String(actorId)) {
        throw new AppError("Bạn không thể tự hạ quyền hoặc thay đổi vai trò tài khoản Quản trị viên của chính mình.", 403);
    }
    if (user.role?.toLowerCase() === "admin") {
        throw new AppError("Không thể chỉnh sửa, vô hiệu hóa hoặc xóa tài khoản Quản trị viên (Admin) khác.", 403);
    }

    if (role === "shipper") {
        const assignedOwnerId = ownerId === undefined
            ? (user.role === "shipper" ? user.ownerId : null)
            : ownerId;
        if (assignedOwnerId) {
            await requireActiveOwner(assignedOwnerId);
        }
        user.ownerId = assignedOwnerId ?? null;
    } else {
        user.ownerId = null;
    }

    user.role = role;
    user.tokenVersion += 1;
    await user.save();
    disconnectUserSockets(userId);
    return user;
}