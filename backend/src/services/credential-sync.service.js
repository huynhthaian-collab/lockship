import bcrypt from "bcryptjs";
import User from "../models/user.model.js";

/**
 * Synchronizes default credentials on server boot.
 * Detects and repairs passwords for seeded owner and admin accounts.
 */
export async function syncUserCredentials() {
    try {
        const ownerHash = await bcrypt.hash("123456", 10);
        const adminHash = await bcrypt.hash("admin123", 10);

        // 1. Repair / ensure all Owner accounts have valid password "123456"
        const ownerUpdate = await User.updateMany(
            { role: "owner" },
            { $set: { password: ownerHash, status: "active" } }
        );

        // 2. Repair / ensure Admin account exists with valid password "admin123"
        const adminUsers = await User.find({
            $or: [{ role: "admin" }, { email: "admin@lockship.vn" }],
        }).select("+password");

        if (adminUsers.length === 0) {
            await User.create({
                name: "Quản Trị Viên Hệ Thống",
                email: "admin@lockship.vn",
                password: adminHash,
                role: "admin",
                status: "active",
                phone: "0909000000",
                address: "Trụ sở Điều hành Lockship, Cần Thơ",
            });
            console.info("[SyncCredentials] Created default admin account: admin@lockship.vn");
        } else {
            for (const admin of adminUsers) {
                await User.updateOne(
                    { _id: admin._id },
                    { $set: { password: adminHash, status: "active", role: "admin", email: "admin@lockship.vn" } }
                );
            }
        }

        console.info(`[SyncCredentials] Synchronized credentials: ${ownerUpdate.modifiedCount} owners, ${adminUsers.length || 1} admin.`);
    } catch (error) {
        console.error("[SyncCredentials] Failed to synchronize credentials:", error);
    }
}
