import { randomUUID } from "node:crypto";
import dns from "node:dns";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Set reliable public DNS servers for Windows SRV queries (mongodb+srv://)
try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
    // ignore
}

// Load environment variables from backend/.env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DEFAULT_PASSWORD_HASH = "$2a$12$XIYFgx/JOanNUsqu5ho4GOrOH/F/0N271ASHT/a.N2b9v0ht5jTme"; // Bcrypt hash of "123456"

// 10 Owner Accounts to seed
export const OWNERS_DATA = [
    {
        _id: new mongoose.Types.ObjectId("671000000000000000000101"),
        name: "Bùi Tú Anh",
        email: "tuanh.bui@lockship.vn",
        phone: "0901234501",
        address: "Số 12 Đường 3/2, P. Xuân Khánh, Q. Ninh Kiều, Cần Thơ",
        lat: 10.0299,
        lng: 105.7706,
        boxNumber: "05",
        boxCode: "BOX-NK-CT-05",
        boxName: "Lockship Box #05 (Xuân Khánh - Ninh Kiều)",
    },
    {
        _id: new mongoose.Types.ObjectId("671000000000000000000102"),
        name: "Lê Châu Bảo Ngân",
        email: "baongan.le@lockship.vn",
        phone: "0901234502",
        address: "Số 45 Đại lộ Hòa Bình, P. Tân An, Q. Ninh Kiều, Cần Thơ",
        lat: 10.0342,
        lng: 105.7831,
        boxNumber: "06",
        boxCode: "BOX-NK-CT-06",
        boxName: "Lockship Box #06 (Tân An - Ninh Kiều)",
    },
    {
        _id: new mongoose.Types.ObjectId("671000000000000000000103"),
        name: "Nguyễn Hữu Thành",
        email: "huuthanh.nguyen@lockship.vn",
        phone: "0901234503",
        address: "Số 108 Nguyễn Văn Cừ, P. An Hòa, Q. Ninh Kiều, Cần Thơ",
        lat: 10.0451,
        lng: 105.7623,
        boxNumber: "07",
        boxCode: "BOX-NK-CT-07",
        boxName: "Lockship Box #07 (An Hòa - Ninh Kiều)",
    },
    {
        _id: new mongoose.Types.ObjectId("671000000000000000000104"),
        name: "Châu Văn Liêm",
        email: "vanliem.chau@lockship.vn",
        phone: "0901234504",
        address: "Số 22 Mậu Thân, P. An Phú, Q. Ninh Kiều, Cần Thơ",
        lat: 10.0378,
        lng: 105.7745,
        boxNumber: "08",
        boxCode: "BOX-NK-CT-08",
        boxName: "Lockship Box #08 (An Phú - Ninh Kiều)",
    },
    {
        _id: new mongoose.Types.ObjectId("671000000000000000000105"),
        name: "Đặng Huỳnh Khải Minh",
        email: "khaiminh.dang@lockship.vn",
        phone: "0901234505",
        address: "Số 88 Trần Hưng Đạo, P. An Nghiệp, Q. Ninh Kiều, Cần Thơ",
        lat: 10.0315,
        lng: 105.7782,
        boxNumber: "09",
        boxCode: "BOX-NK-CT-09",
        boxName: "Lockship Box #09 (An Nghiệp - Ninh Kiều)",
    },
    {
        _id: new mongoose.Types.ObjectId("671000000000000000000106"),
        name: "Trần Tiến Đạt",
        email: "tiendat.tran@lockship.vn",
        phone: "0901234506",
        address: "Số 64 Nguyễn Văn Linh, P. Hưng Lợi, Q. Ninh Kiều, Cần Thơ",
        lat: 10.0218,
        lng: 105.7612,
        boxNumber: "10",
        boxCode: "BOX-NK-CT-10",
        boxName: "Lockship Box #10 (Hưng Lợi - Ninh Kiều)",
    },
    {
        _id: new mongoose.Types.ObjectId("671000000000000000000107"),
        name: "Lê Huỳnh Khả Vy",
        email: "khavy.le@lockship.vn",
        phone: "0901234507",
        address: "KDC Hưng Phú 1, P. Hưng Phú, Q. Cái Răng, Cần Thơ",
        lat: 10.0152,
        lng: 105.7911,
        boxNumber: "11",
        boxCode: "BOX-CR-CT-11",
        boxName: "Lockship Box #11 (Hưng Phú - Cái Răng)",
    },
    {
        _id: new mongoose.Types.ObjectId("671000000000000000000108"),
        name: "Nguyễn Thị Bảo Châu",
        email: "baochau.nguyen@lockship.vn",
        phone: "0901234508",
        address: "Số 150 Cách Mạng Tháng 8, P. Bùi Hữu Nghĩa, Q. Bình Thủy, Cần Thơ",
        lat: 10.0573,
        lng: 105.7542,
        boxNumber: "12",
        boxCode: "BOX-BT-CT-12",
        boxName: "Lockship Box #12 (Bùi Hữu Nghĩa - Bình Thủy)",
    },
    {
        _id: new mongoose.Types.ObjectId("671000000000000000000109"),
        name: "Trần Duy Khải",
        email: "duykhai.tran@lockship.vn",
        phone: "0901234509",
        address: "Số 39 Lê Bình, P. Hưng Lợi, Q. Ninh Kiều, Cần Thơ",
        lat: 10.0245,
        lng: 105.7689,
        boxNumber: "13",
        boxCode: "BOX-NK-CT-13",
        boxName: "Lockship Box #13 (Lê Bình - Hưng Lợi)",
    },
    {
        _id: new mongoose.Types.ObjectId("671000000000000000000110"),
        name: "Bùi Ngọc Yến Linh",
        email: "yenlinh.bui@lockship.vn",
        phone: "0901234510",
        address: "Số 75 Lý Tự Trọng, P. An Phú, Q. Ninh Kiều, Cần Thơ",
        lat: 10.0361,
        lng: 105.7794,
        boxNumber: "14",
        boxCode: "BOX-NK-CT-14",
        boxName: "Lockship Box #14 (Lý Tự Trọng - An Phú)",
    },
];

/**
 * Builds QR metadata for box QR scans
 */
function buildQrMetadata(boxId) {
    const baseHost = "https://lockship-gamma.vercel.app";
    const qrUrl = `${baseHost}/public/box-scan/${boxId}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrUrl)}`;
    return { qrUrl, qrImageUrl };
}

/**
 * Safe, idempotent seed function that appends 10 new owners, boxes #05-#14, mock deliveries,
 * box access requests, and natural Vietnamese activity logs.
 * NEVER deletes or drops any existing data.
 */
export async function seedOwnersSafely({ mongoUri, closeConnection = true } = {}) {
    const targetUri = mongoUri || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lockship";
    const maskedUri = targetUri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@");

    console.info("================================================================================");
    console.info("🚀 LOCKSHIP SAFE SEED SCRIPT: BẮT ĐẦU NẠP DỮ LIỆU NỐI TIẾP VÀO MONGODB");
    console.info(`📌 Database URI: ${maskedUri}`);
    console.info("================================================================================");

    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(targetUri, { serverSelectionTimeoutMS: 15000 });
        console.info("✓ Đã kết nối MongoDB thành công.");
    }

    const db = mongoose.connection.db;

    // Collections
    const usersColl = db.collection("users");
    const boxesColl = db.collection("boxes");
    const iotDevicesColl = db.collection("iotdevices");
    const vehiclesColl = db.collection("vehicles");
    const deliveriesColl = db.collection("deliveries");
    const accessReqColl = db.collection("boxaccessrequests");
    const iotEventsColl = db.collection("iotevents");

    // --------------------------------------------------------------------------
    // BƯỚC 1: KIỂM TRA SỐ LƯỢNG BOX VÀ DỮ LIỆU HIỆN CÓ
    // --------------------------------------------------------------------------
    console.info("\n--- BƯỚC 1: Kiểm tra tính toàn vẹn của dữ liệu hiện có ---");
    const initialUserCount = await usersColl.countDocuments();
    const initialDeviceCount = await iotDevicesColl.countDocuments();
    const initialBoxCount = await boxesColl.countDocuments();
    const initialDeliveryCount = await deliveriesColl.countDocuments();

    console.info(`- Users hiện có: ${initialUserCount}`);
    console.info(`- IoT Devices hiện có: ${initialDeviceCount}`);
    console.info(`- Boxes hiện có: ${initialBoxCount}`);
    console.info(`- Deliveries (Orders) hiện có: ${initialDeliveryCount}`);

    // Đảm bảo 4 box ban đầu (LOCKSHIP-BOX-001 -> LOCKSHIP-BOX-004) có mặt trong collection boxes nếu chưa có
    const initialFourDevices = await iotDevicesColl.find({
        deviceId: { $in: ["LOCKSHIP-BOX-001", "LOCKSHIP-BOX-002", "LOCKSHIP-BOX-003", "LOCKSHIP-BOX-004"] },
    }).toArray();

    if (initialFourDevices.length > 0) {
        console.info(`✓ Tìm thấy ${initialFourDevices.length} Box có sẵn trong database. Giữ nguyên chủ sở hữu cũ.`);
        for (const dev of initialFourDevices) {
            const numStr = dev.deviceId.slice(-3);
            const { qrUrl, qrImageUrl } = buildQrMetadata(dev.deviceId);
            await boxesColl.updateOne(
                { boxId: dev.deviceId },
                {
                    $setOnInsert: {
                        boxId: dev.deviceId,
                        code: `BOX-NK-CT-${numStr}`,
                        name: `Lockship Box #${numStr}`,
                        address: "Vị trí trạm tủ thông minh Lockship Cần Thơ",
                        location: { lat: 10.0336, lng: 105.7882 },
                        ownerId: dev.ownerId,
                        status: "AVAILABLE",
                        lockStatus: dev.lockStatus || "locked",
                        pinCode: "123456",
                        qrUrl,
                        qrImageUrl,
                        totalCompartments: 12,
                        availableCompartments: 8,
                        battery: dev.battery || 95,
                        isOnline: dev.status === "online",
                        createdAt: dev.createdAt || new Date(),
                        updatedAt: new Date(),
                    },
                },
                { upsert: true },
            );
        }
    }

    // --------------------------------------------------------------------------
    // BƯỚC 2: UPSERT 10 TÀI KHOẢN CHỦ TỦ (ROLE: 'owner')
    // --------------------------------------------------------------------------
    console.info("\n--- BƯỚC 2: Thêm tiếp 10 Chủ sở hữu tủ khóa (role: 'owner') ---");
    const seededOwnersMap = new Map();

    for (const ownerData of OWNERS_DATA) {
        const existingUser = await usersColl.findOne({ email: ownerData.email });
        if (existingUser) {
            console.info(`  • [Đã tồn tại] Chủ tủ: ${ownerData.name} (${ownerData.email})`);
            seededOwnersMap.set(ownerData.email, existingUser);
        } else {
            const newUserDoc = {
                _id: ownerData._id,
                name: ownerData.name,
                email: ownerData.email.toLowerCase(),
                password: DEFAULT_PASSWORD_HASH,
                phone: ownerData.phone,
                address: ownerData.address,
                role: "owner",
                status: "active",
                authProvider: "local",
                currentLocation: {
                    lat: ownerData.lat,
                    lng: ownerData.lng,
                    updatedAt: new Date(),
                },
                tokenVersion: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await usersColl.insertOne(newUserDoc);
            console.info(`  ✓ [Tạo mới] Chủ tủ: ${ownerData.name} (${ownerData.email}) - Mật khẩu: 123456`);
            seededOwnersMap.set(ownerData.email, newUserDoc);
        }
    }

    // --------------------------------------------------------------------------
    // BƯỚC 3: NỐI TIẾP CÁC BOX MỚI (BẮT ĐẦU TỪ BOX #05 ĐẾN BOX #14)
    // --------------------------------------------------------------------------
    console.info("\n--- BƯỚC 3: Thêm nối tiếp Tủ khóa Thông minh (từ Box #05 đến Box #14) ---");

    for (let i = 0; i < OWNERS_DATA.length; i++) {
        const ownerInfo = OWNERS_DATA[i];
        const ownerDoc = seededOwnersMap.get(ownerInfo.email);
        const ownerId = ownerDoc._id;

        const boxId = `LOCKSHIP-BOX-0${ownerInfo.boxNumber}`;
        const { qrUrl, qrImageUrl } = buildQrMetadata(boxId);

        // Tạo phương tiện/trạm xe gắn kết nếu cần
        const vehiclePlate = `65C-100.${ownerInfo.boxNumber}`;
        const vehicleId = new mongoose.Types.ObjectId(`6710000000000000000002${ownerInfo.boxNumber}`);

        await vehiclesColl.updateOne(
            { plateNumber: vehiclePlate },
            {
                $setOnInsert: {
                    _id: vehicleId,
                    ownerId,
                    plateNumber: vehiclePlate,
                    type: "Trạm Tủ Thông Minh Cố Định",
                    model: "Lockship Smart Locker Unit v2",
                    iotDeviceId: boxId,
                    status: "active",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            },
            { upsert: true },
        );

        // 1. Cập nhật vào collection `boxes`
        const boxFilter = { boxId };
        const boxUpdate = {
            $setOnInsert: {
                _id: new mongoose.Types.ObjectId(`6710000000000000000003${ownerInfo.boxNumber}`),
                boxId,
                code: ownerInfo.boxCode,
                name: ownerInfo.boxName,
                address: ownerInfo.address,
                location: {
                    lat: ownerInfo.lat,
                    lng: ownerInfo.lng,
                },
                ownerId,
                status: "AVAILABLE",
                lockStatus: "locked",
                pinCode: "123456",
                qrUrl,
                qrImageUrl,
                totalCompartments: 12,
                availableCompartments: 8,
                battery: 95,
                isOnline: true,
                description: `Trạm tủ thông minh Lockship tại ${ownerInfo.address}, hoạt động 24/7.`,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        };
        await boxesColl.updateOne(boxFilter, boxUpdate, { upsert: true });

        // 2. Đồng bộ vào collection `iotdevices`
        const deviceFilter = { deviceId: boxId };
        const deviceUpdate = {
            $setOnInsert: {
                _id: new mongoose.Types.ObjectId(`6710000000000000000003${ownerInfo.boxNumber}`),
                deviceId: boxId,
                credentialId: randomUUID(),
                vehicleId,
                ownerId,
                status: "online",
                lockStatus: "locked",
                battery: 95,
                lastSeen: new Date(),
                firmwareVersion: "v2.5.0-esp32",
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        };
        await iotDevicesColl.updateOne(deviceFilter, deviceUpdate, { upsert: true });

        console.info(`  ✓ Box #${ownerInfo.boxNumber} (${boxId}) -> Chủ sở hữu: ${ownerInfo.name} | Tọa độ: [${ownerInfo.lat}, ${ownerInfo.lng}]`);
    }

    // --------------------------------------------------------------------------
    // BƯỚC 4: TẠO 20 ĐƠN HÀNG GIẢ LẬP (MỖI OWNER 2 ĐƠN HÀNG)
    // --------------------------------------------------------------------------
    console.info("\n--- BƯỚC 4: Tạo 20 đơn hàng mẫu gắn với Box của từng Owner ---");

    // Lấy 1 shipper có sẵn trong hệ thống để gán đơn đã giao
    const activeShipper = await usersColl.findOne({ role: "shipper", status: "active" });
    const fallbackShipperId = activeShipper?._id || new mongoose.Types.ObjectId("671000000000000000000004");

    for (let i = 0; i < OWNERS_DATA.length; i++) {
        const ownerInfo = OWNERS_DATA[i];
        const ownerDoc = seededOwnersMap.get(ownerInfo.email);
        const ownerId = ownerDoc._id;
        const boxId = `LOCKSHIP-BOX-0${ownerInfo.boxNumber}`;

        // Đơn 1: PENDING (để test nhận đơn khoảng cách và xác thực QR)
        const pendingDeliveryId = new mongoose.Types.ObjectId(`6710000000000000000004${ownerInfo.boxNumber}`);
        const pendingDelivery = {
            _id: pendingDeliveryId,
            ownerId,
            shipperId: null,
            vehicleId: null,
            pickupAddress: "Trung tâm Phân loại Ninh Kiều, 12 Đại lộ Hòa Bình, Q. Ninh Kiều, TP. Cần Thơ",
            deliveryAddress: ownerInfo.address,
            pickupLocation: { lat: 10.0342, lng: 105.7831 },
            deliveryLocation: { lat: ownerInfo.lat, lng: ownerInfo.lng },
            boxId,
            recipientName: `Khách hàng nhận tại Box #${ownerInfo.boxNumber}`,
            recipientPhone: `09811000${ownerInfo.boxNumber}`,
            packageSize: "M",
            description: `Kiện hàng bưu phẩm chuẩn bị giao vào trạm tủ ${boxId}`,
            status: "pending",
            unlockStatus: null,
            createdAt: new Date(Date.now() - 3600000 * 2),
            updatedAt: new Date(Date.now() - 3600000 * 2),
        };
        await deliveriesColl.updateOne(
            { _id: pendingDeliveryId },
            { $setOnInsert: pendingDelivery },
            { upsert: true },
        );

        // Đơn 2: DELIVERED_TO_LOCKER (để phục vụ số liệu thống kê Dashboard)
        const completedDeliveryId = new mongoose.Types.ObjectId(`6710000000000000000005${ownerInfo.boxNumber}`);
        const completedDelivery = {
            _id: completedDeliveryId,
            ownerId,
            shipperId: fallbackShipperId,
            vehicleId: null,
            pickupAddress: "Kho trung chuyển Tây Đô, 78 Trần Hưng Đạo, P. An Nghiệp, Q. Ninh Kiều, TP. Cần Thơ",
            deliveryAddress: ownerInfo.address,
            pickupLocation: { lat: 10.0315, lng: 105.7782 },
            deliveryLocation: { lat: ownerInfo.lat, lng: ownerInfo.lng },
            boxId,
            recipientName: `Người nhận ${ownerInfo.name}`,
            recipientPhone: `09822000${ownerInfo.boxNumber}`,
            packageSize: "M",
            description: `Kiện hàng thương mại điện tử đã nạp vào hộc tủ an toàn tại ${boxId}`,
            status: "delivered_to_locker",
            unlockStatus: "succeeded",
            arrivedAt: new Date(Date.now() - 7200000),
            authorizedAt: new Date(Date.now() - 5400000),
            completedAt: new Date(Date.now() - 3600000),
            createdAt: new Date(Date.now() - 10800000),
            updatedAt: new Date(Date.now() - 3600000),
        };
        await deliveriesColl.updateOne(
            { _id: completedDeliveryId },
            { $setOnInsert: completedDelivery },
            { upsert: true },
        );

        console.info(`  ✓ Owner ${ownerInfo.name}: Đã tạo 1 đơn [pending] & 1 đơn [delivered_to_locker] cho Box #${ownerInfo.boxNumber}`);
    }

    // --------------------------------------------------------------------------
    // BƯỚC 5: TẠO 3 YÊU CẦU MỞ TỦ VÃNG LAI (BoxAccessRequest)
    // --------------------------------------------------------------------------
    console.info("\n--- BƯỚC 5: Tạo 3 yêu cầu mở tủ QR vãng lai (PENDING) ---");

    const accessRequests = [
        {
            _id: new mongoose.Types.ObjectId("671000000000000000000601"),
            boxId: "LOCKSHIP-BOX-005",
            ownerEmail: "tuanh.bui@lockship.vn",
            shipperName: "Shipper Viettel Post (Nguyễn Văn An)",
            shipperPhone: "0987111222",
            deliverySource: "Viettel Post - Bưu chính Cần Thơ",
            packageDescription: "Bưu kiện tài liệu khẩn cấp và linh kiện văn phòng",
        },
        {
            _id: new mongoose.Types.ObjectId("671000000000000000000602"),
            boxId: "LOCKSHIP-BOX-006",
            ownerEmail: "baongan.le@lockship.vn",
            shipperName: "Shipper GHTK Cần Thơ (Trần Quốc Bảo)",
            shipperPhone: "0978333444",
            deliverySource: "Giao Hàng Tiết Kiệm (GHTK)",
            packageDescription: "Hộp quà tặng mỹ phẩm cao cấp và phụ kiện",
        },
        {
            _id: new mongoose.Types.ObjectId("671000000000000000000603"),
            boxId: "LOCKSHIP-BOX-009",
            ownerEmail: "khaiminh.dang@lockship.vn",
            shipperName: "Shipper SPX Express (Lê Thanh Tùng)",
            shipperPhone: "0969555666",
            deliverySource: "Shopee Express (SPX)",
            packageDescription: "Kiện hàng thời trang nam và phụ kiện công nghệ",
        },
    ];

    for (const req of accessRequests) {
        const ownerDoc = seededOwnersMap.get(req.ownerEmail);
        const doc = {
            _id: req._id,
            boxId: req.boxId,
            ownerId: ownerDoc._id,
            shipperName: req.shipperName,
            shipperPhone: req.shipperPhone,
            deliverySource: req.deliverySource,
            packageDescription: req.packageDescription,
            orderId: null,
            status: "PENDING",
            unlockCode: null,
            respondedAt: null,
            notes: "",
            createdAt: new Date(Date.now() - 1800000),
            updatedAt: new Date(Date.now() - 1800000),
        };
        await accessReqColl.updateOne({ _id: req._id }, { $setOnInsert: doc }, { upsert: true });
        console.info(`  ✓ Yêu cầu mở tủ [${req.boxId}] từ ${req.shipperName} (${req.shipperPhone}) -> Chủ tủ: ${ownerDoc.name}`);
    }

    // --------------------------------------------------------------------------
    // BƯỚC 6: TẠO 20 DÒNG NHẬT KÝ HOẠT ĐỘNG (ActivityLogs / IoTEvent)
    // --------------------------------------------------------------------------
    console.info("\n--- BƯỚC 6: Tạo 20 dòng nhật ký hoạt động tiếng Việt tự nhiên ---");

    const naturalLogs = [
        {
            idHex: "01",
            boxId: "LOCKSHIP-BOX-005",
            ownerEmail: "tuanh.bui@lockship.vn",
            type: "order_created",
            timeOffsetMs: 14400000,
            message: "Chủ sở hữu Bùi Tú Anh vừa tạo mới đơn hàng giao vào tủ Lockship Box #05.",
        },
        {
            idHex: "02",
            boxId: "LOCKSHIP-BOX-005",
            ownerEmail: "tuanh.bui@lockship.vn",
            type: "delivery_accepted",
            timeOffsetMs: 12600000,
            message: "Shipper Lê Hoàng Nam đã nhận đơn hàng và đang di chuyển tới trạm tủ Lockship Box #05.",
        },
        {
            idHex: "03",
            boxId: "LOCKSHIP-BOX-005",
            ownerEmail: "tuanh.bui@lockship.vn",
            type: "delivery_arrived",
            timeOffsetMs: 10800000,
            message: "Shipper Lê Hoàng Nam đã có mặt tại trạm Lockship Box #05 và sẵn sàng nạp kiện hàng.",
        },
        {
            idHex: "04",
            boxId: "LOCKSHIP-BOX-005",
            ownerEmail: "tuanh.bui@lockship.vn",
            type: "delivery_authorized",
            timeOffsetMs: 9000000,
            message: "Chủ sở hữu Bùi Tú Anh đã phê duyệt yêu cầu mở tủ và sinh mã OTP an toàn.",
        },
        {
            idHex: "05",
            boxId: "LOCKSHIP-BOX-005",
            ownerEmail: "tuanh.bui@lockship.vn",
            type: "unlock_succeeded",
            timeOffsetMs: 7200000,
            message: "Mở khóa thành công hộc tủ Lockship Box #05 qua giao thức MQTT an toàn.",
        },
        {
            idHex: "06",
            boxId: "LOCKSHIP-BOX-005",
            ownerEmail: "tuanh.bui@lockship.vn",
            type: "delivery_completed",
            timeOffsetMs: 5400000,
            message: "Đơn hàng tại trạm Lockship Box #05 đã được chốt khóa và hoàn tất thành công!",
        },
        {
            idHex: "07",
            boxId: "LOCKSHIP-BOX-005",
            ownerEmail: "tuanh.bui@lockship.vn",
            type: "device_online",
            timeOffsetMs: 3600000,
            message: "Trạm Lockship Box #05 gửi tín hiệu hoạt động: Pin 98%, chốt khóa đã chốt an toàn.",
        },
        {
            idHex: "08",
            boxId: "LOCKSHIP-BOX-006",
            ownerEmail: "baongan.le@lockship.vn",
            type: "order_created",
            timeOffsetMs: 13000000,
            message: "Chủ sở hữu Lê Châu Bảo Ngân vừa tạo mới đơn hàng tại trạm Lockship Box #06.",
        },
        {
            idHex: "09",
            boxId: "LOCKSHIP-BOX-006",
            ownerEmail: "baongan.le@lockship.vn",
            type: "delivery_accepted",
            timeOffsetMs: 11000000,
            message: "Shipper Phạm Quốc Tuấn đã nhận đơn hàng giao vào trạm Lockship Box #06.",
        },
        {
            idHex: "10",
            boxId: "LOCKSHIP-BOX-006",
            ownerEmail: "baongan.le@lockship.vn",
            type: "unlock_succeeded",
            timeOffsetMs: 8000000,
            message: "Mở khóa thành công hộc tủ Lockship Box #06 cho đơn hàng bằng mã định danh an toàn.",
        },
        {
            idHex: "11",
            boxId: "LOCKSHIP-BOX-006",
            ownerEmail: "baongan.le@lockship.vn",
            type: "delivery_completed",
            timeOffsetMs: 6000000,
            message: "Hoàn tất giao nhận đơn hàng tại trạm Lockship Box #06.",
        },
        {
            idHex: "12",
            boxId: "LOCKSHIP-BOX-007",
            ownerEmail: "huuthanh.nguyen@lockship.vn",
            type: "order_created",
            timeOffsetMs: 12000000,
            message: "Chủ sở hữu Nguyễn Hữu Thành vừa tạo mới đơn hàng tại trạm Lockship Box #07.",
        },
        {
            idHex: "13",
            boxId: "LOCKSHIP-BOX-007",
            ownerEmail: "huuthanh.nguyen@lockship.vn",
            type: "delivery_accepted",
            timeOffsetMs: 9500000,
            message: "Shipper Võ Minh Khang đã nhận đơn hàng trạm Lockship Box #07 qua ứng dụng Lockship.",
        },
        {
            idHex: "14",
            boxId: "LOCKSHIP-BOX-007",
            ownerEmail: "huuthanh.nguyen@lockship.vn",
            type: "unlock_succeeded",
            timeOffsetMs: 7000000,
            message: "Mở khóa thành công hộc số 02 trạm Lockship Box #07 bằng mã PIN bảo mật.",
        },
        {
            idHex: "15",
            boxId: "LOCKSHIP-BOX-008",
            ownerEmail: "vanliem.chau@lockship.vn",
            type: "order_created",
            timeOffsetMs: 10000000,
            message: "Chủ sở hữu Châu Văn Liêm vừa tạo mới đơn hàng tại trạm Lockship Box #08.",
        },
        {
            idHex: "16",
            boxId: "LOCKSHIP-BOX-008",
            ownerEmail: "vanliem.chau@lockship.vn",
            type: "device_online",
            timeOffsetMs: 4500000,
            message: "Trạm Lockship Box #08 đồng bộ trạng thái trực tuyến: Pin 96%, tín hiệu IoT ổn định.",
        },
        {
            idHex: "17",
            boxId: "LOCKSHIP-BOX-009",
            ownerEmail: "khaiminh.dang@lockship.vn",
            type: "order_created",
            timeOffsetMs: 9000000,
            message: "Chủ sở hữu Đặng Huỳnh Khải Minh vừa tạo mới đơn hàng tại trạm Lockship Box #09.",
        },
        {
            idHex: "18",
            boxId: "LOCKSHIP-BOX-010",
            ownerEmail: "tiendat.tran@lockship.vn",
            type: "order_created",
            timeOffsetMs: 8500000,
            message: "Chủ sở hữu Trần Tiến Đạt vừa tạo mới đơn hàng tại trạm Lockship Box #10.",
        },
        {
            idHex: "19",
            boxId: "LOCKSHIP-BOX-011",
            ownerEmail: "khavy.le@lockship.vn",
            type: "delivery_completed",
            timeOffsetMs: 5000000,
            message: "Chủ sở hữu Lê Huỳnh Khả Vy xác nhận hoàn tất giao nhận tại trạm Lockship Box #11.",
        },
        {
            idHex: "20",
            boxId: "LOCKSHIP-BOX-012",
            ownerEmail: "baochau.nguyen@lockship.vn",
            type: "device_online",
            timeOffsetMs: 3000000,
            message: "Trạm Lockship Box #12 gửi tín hiệu hoạt động: Pin 99%, sẵn sàng nhận kiện hàng.",
        },
    ];

    for (const logItem of naturalLogs) {
        const ownerDoc = seededOwnersMap.get(logItem.ownerEmail);
        const eventId = new mongoose.Types.ObjectId(`6710000000000000000007${logItem.idHex}`);
        const eventTime = new Date(Date.now() - logItem.timeOffsetMs);

        const eventDoc = {
            _id: eventId,
            deviceId: logItem.boxId,
            ownerId: ownerDoc._id,
            type: logItem.type,
            topic: `lockship/boxes/${logItem.boxId}/event`,
            payload: {
                message: logItem.message,
                deviceId: logItem.boxId,
                ownerId: ownerDoc._id,
                battery: 98,
                lockStatus: logItem.type === "unlock_succeeded" ? "unlocked" : "locked",
            },
            createdAt: eventTime,
        };

        await iotEventsColl.updateOne({ _id: eventId }, { $setOnInsert: eventDoc }, { upsert: true });
        console.info(`  • [${logItem.type}] ${logItem.message}`);
    }

    // --------------------------------------------------------------------------
    // BƯỚC 7: TỔNG KẾT DỮ LIỆU
    // --------------------------------------------------------------------------
    console.info("\n================================================================================");
    console.info("🎉 HOÀN THÀNH SEED DỮ LIỆU THÀNH CÔNG VÀO MONGODB!");
    console.info("================================================================================");
    const finalUserCount = await usersColl.countDocuments();
    const finalDeviceCount = await iotDevicesColl.countDocuments();
    const finalBoxCount = await boxesColl.countDocuments();
    const finalDeliveryCount = await deliveriesColl.countDocuments();
    const finalReqCount = await accessReqColl.countDocuments();
    const finalLogCount = await iotEventsColl.countDocuments();

    console.info(`✓ Tổng Users: ${finalUserCount} (Đã thêm 10 Owner mới)`);
    console.info(`✓ Tổng IoT Devices: ${finalDeviceCount} (Đã nối tiếp Box #05 -> #14)`);
    console.info(`✓ Tổng Boxes: ${finalBoxCount} (Đã bảo toàn 4 Box cũ + thêm 10 Box mới)`);
    console.info(`✓ Tổng Deliveries (Orders): ${finalDeliveryCount} (Đã thêm 20 đơn hàng mẫu)`);
    console.info(`✓ Tổng Yêu cầu mở tủ vãng lai: ${finalReqCount} (Đã thêm 3 yêu cầu PENDING)`);
    console.info(`✓ Tổng Nhật ký hoạt động: ${finalLogCount} (Đã thêm 20 logs tự nhiên tiếng Việt)`);

    console.info("\n📋 Danh sách đăng nhập 10 Chủ sở hữu tủ khóa mới (Mật khẩu chung: 123456):");
    OWNERS_DATA.forEach((o, idx) => {
        console.info(`  ${idx + 1}. ${o.name.padEnd(24)} | Email: ${o.email.padEnd(28)} | Box: #${o.boxNumber}`);
    });
    console.info("================================================================================\n");

    if (closeConnection) {
        await mongoose.disconnect();
        console.info("✓ Đã ngắt kết nối an toàn với MongoDB.");
    }

    return {
        success: true,
        seededOwners: OWNERS_DATA.length,
        totalBoxes: finalBoxCount,
        totalOrders: finalDeliveryCount,
    };
}

// Chạy trực tiếp nếu script được gọi qua dòng lệnh: node scripts/seed-10-owners.js
if (process.argv[1] && process.argv[1].endsWith("seed-10-owners.js")) {
    seedOwnersSafely()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error("❌ Lỗi khi seed dữ liệu:", err);
            process.exit(1);
        });
}

