import bcrypt from "bcryptjs";
import User from "../models/user.model.js";

/**
 * Synchronizes default credentials on server boot.
 * Detects and repairs double-hashed passwords for seeded owner and admin accounts.
 */
export async function syncUserCredentials() {
    try {
        const ownerHash = await bcrypt.hash("123456", 10);
        const adminHash = await bcrypt.hash("admin123", 10);

        const owners = await User.find({ role: "owner" }).select("+password");
        let fixedOwners = 0;

        for (const owner of owners) {
            const matches = await owner.comparePassword("123456");
            if (!matches) {
                await User.updateOne(
                    { _id: owner._id },
                    { $set: { password: ownerHash, status: "active" } }
                );
                fixedOwners += 1;
            }
        }

        let fixedAdmin = 0;
        const admin = await User.findOne({ email: "admin@lockship.vn" }).select("+password");
        if (admin) {
            const matches = await admin.comparePassword("admin123");
            if (!matches) {
                await User.updateOne(
                    { _id: admin._id },
                    { $set: { password: adminHash, status: "active" } }
                );
                fixedAdmin += 1;
            }
        }

        if (fixedOwners > 0 || fixedAdmin > 0) {
            console.info(`[SyncCredentials] Repaired credentials for ${fixedOwners} owner(s) and ${fixedAdmin} admin.`);
        }
    } catch (error) {
        console.error("[SyncCredentials] Failed to synchronize credentials:", error);
    }
}
