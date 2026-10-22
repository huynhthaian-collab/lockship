import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import User from "../src/models/user.model.js";
import Vehicle from "../src/models/vehicle.model.js";
import IoTDevice from "../src/models/iot-device.model.js";
import Delivery from "../src/models/delivery.model.js";
import DeliveryIssue from "../src/models/delivery-issue.model.js";
import IoTEvent from "../src/models/iot-event.model.js";
import Notification from "../src/models/notification.model.js";
import OtpVerification from "../src/models/otp-verification.model.js";
import RevokedToken from "../src/models/revoked-token.model.js";
import UnlockCode from "../src/models/unlock-code.model.js";
import Feedback from "../src/models/feedback.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedDir = path.resolve(__dirname, "../seed-data");

function transformExtendedJson(data) {
    if (data === null || data === undefined) return data;
    if (Array.isArray(data)) return data.map(transformExtendedJson);
    if (typeof data === "object") {
        if (Object.prototype.hasOwnProperty.call(data, "$oid")) {
            return new mongoose.Types.ObjectId(data.$oid);
        }
        if (Object.prototype.hasOwnProperty.call(data, "$date")) {
            return new Date(data.$date);
        }
        const transformed = {};
        for (const [key, value] of Object.entries(data)) {
            transformed[key] = transformExtendedJson(value);
        }
        return transformed;
    }
    return data;
}

async function loadSeed(collectionName) {
    const raw = await readFile(path.join(seedDir, `${collectionName}.json`), "utf8");
    return transformExtendedJson(JSON.parse(raw));
}

const mapping = [
    { name: "users", model: User },
    { name: "vehicles", model: Vehicle },
    { name: "iotdevices", model: IoTDevice },
    { name: "deliveries", model: Delivery },
    { name: "deliveryissues", model: DeliveryIssue },
    { name: "iotevents", model: IoTEvent },
    { name: "notifications", model: Notification },
    { name: "otpverifications", model: OtpVerification },
    { name: "revokedtokens", model: RevokedToken },
    { name: "unlockcodes", model: UnlockCode },
    { name: "feedbacks", model: Feedback },
];

try {
    console.info("Đang kết nối MongoDB:", env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, "//***:***@"));
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.info("Kết nối MongoDB thành công!");

    for (const { name, model } of mapping) {
        const records = await loadSeed(name);
        for (const record of records) {
            await model.findByIdAndUpdate(record._id, record, { upsert: true, new: true, runValidators: false });
        }
        console.info(`✓ Đã nạp thành công ${records.length} bản ghi vào collection '${name}'`);
    }

    console.info("\n🎉 NẠP TOÀN BỘ 11 COLLECTIONS MẪU THÀNH CÔNG VÀO MONGODB!");
    console.info("Thông tin đăng nhập tài khoản mẫu (Mật khẩu: Lockship@123):");
    console.info("- Admin:   admin@lockship.vn");
    console.info("- Owner:   owner.hung@lockship.vn  (Nguyễn Văn Hùng)");
    console.info("- Owner:   owner.mai@lockship.vn   (Trần Thị Mai)");
    console.info("- Shipper: shipper.nam@lockship.vn (Lê Hoàng Nam)");
    console.info("- Shipper: shipper.tuan@lockship.vn (Phạm Quốc Tuấn)");
    console.info("- Shipper: shipper.khang@lockship.vn (Võ Minh Khang)");

    await mongoose.disconnect();
    process.exit(0);
} catch (error) {
    console.error("Lỗi khi nạp dữ liệu mẫu:", error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
}
