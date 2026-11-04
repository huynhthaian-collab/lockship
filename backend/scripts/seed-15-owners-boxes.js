import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const uri =
    process.env.MONGODB_URI ||
    "mongodb+srv://huynhthaian18112004_db_user:f8MFNOdLw4DZzcan@cluster0.qagzliz.mongodb.net/lockship?retryWrites=true&w=majority&appName=Cluster0";

function buildQrMetadata(boxId) {
    const baseHost = "https://lockship-gamma.vercel.app";
    const qrUrl = `${baseHost}/public/box-scan/${boxId}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrUrl)}`;
    return { qrUrl, qrImageUrl };
}

function generateTransferSyntax(ownerName, monthString) {
    const cleanName = (ownerName || "OWNER")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9]/g, "")
        .toUpperCase();
    const cleanMonth = String(monthString || "").replace(/[^0-9]/g, "");
    return `LOCKSHIP ${cleanName} ${cleanMonth}`;
}

const SEED_OWNERS = [
    {
        stt: 1,
        name: "Lê Hoàng Khang",
        email: "khang.lh@lockship.vn",
        phone: "0901234001",
        boxCode: "BOX-01",
        boxName: "Lockship Box #01 (Bến Ninh Kiều)",
        address: "Số 2 Đường Hai Bà Trưng, P. Tân An, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0342, lng: 105.7831 },
        usagesCount: 3,
        status: "UNPAID",
        dates: [
            { day: "05", time: "11:20", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-1011" },
            { day: "14", time: "09:45", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-1012" },
            { day: "24", time: "16:30", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-1013" },
        ],
    },
    {
        stt: 2,
        name: "Nguyễn Thành Vinh",
        email: "vinh.nt@lockship.vn",
        phone: "0901234002",
        boxCode: "BOX-02",
        boxName: "Lockship Box #02 (ĐH Cần Thơ)",
        address: "Khu II, Đường 3/2, P. Xuân Khánh, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0299, lng: 105.7706 },
        usagesCount: 5,
        status: "UNPAID",
        dates: [
            { day: "03", time: "09:15", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-2021" },
            { day: "08", time: "14:30", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-2022" },
            { day: "15", time: "18:40", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-2023" },
            { day: "21", time: "10:20", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-2024" },
            { day: "27", time: "16:05", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-2025" },
        ],
    },
    {
        stt: 3,
        name: "Lê Thị Kim Ngân",
        email: "ngan.ltk@lockship.vn",
        phone: "0901234003",
        boxCode: "BOX-03",
        boxName: "Lockship Box #03 (Vincom Hùng Vương)",
        address: "Số 2 Đường Hùng Vương, P. Thới Bình, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0415, lng: 105.7812 },
        usagesCount: 3,
        status: "UNPAID",
        dates: [
            { day: "04", time: "10:15", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-3031" },
            { day: "13", time: "15:20", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-3032" },
            { day: "22", time: "17:40", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-3033" },
        ],
    },
    {
        stt: 4,
        name: "Trần Ngọc Quế Anh",
        email: "anh.tnq@lockship.vn",
        phone: "0901234004",
        boxCode: "BOX-04",
        boxName: "Lockship Box #04 (Mậu Thân)",
        address: "Số 122 Mậu Thân, P. An Phú, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0378, lng: 105.7745 },
        usagesCount: 3,
        status: "UNPAID",
        dates: [
            { day: "06", time: "08:50", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-4041" },
            { day: "16", time: "14:10", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-4042" },
            { day: "25", time: "11:35", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-4043" },
        ],
    },
    {
        stt: 5,
        name: "Nguyễn Đình Khôi",
        email: "khoi.nd@lockship.vn",
        phone: "0901234005",
        boxCode: "BOX-05",
        boxName: "Lockship Box #05 (Nguyễn Văn Cừ)",
        address: "Số 108 Nguyễn Văn Cừ, P. An Hòa, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0451, lng: 105.7623 },
        usagesCount: 4,
        status: "UNPAID",
        dates: [
            { day: "04", time: "08:30", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-5051" },
            { day: "11", time: "12:15", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-5052" },
            { day: "18", time: "17:50", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-5053" },
            { day: "26", time: "15:10", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-5054" },
        ],
    },
    {
        stt: 6,
        name: "Trần Tiến Việt",
        email: "viet.tt@lockship.vn",
        phone: "0901234006",
        boxCode: "BOX-06",
        boxName: "Lockship Box #06 (Trần Hưng Đạo)",
        address: "Số 88 Trần Hưng Đạo, P. An Nghiệp, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0315, lng: 105.7782 },
        usagesCount: 2,
        status: "UNPAID",
        dates: [
            { day: "07", time: "09:40", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-6061" },
            { day: "21", time: "16:15", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-6062" },
        ],
    },
    {
        stt: 7,
        name: "Trần Đông Đông",
        email: "dong.td@lockship.vn",
        phone: "0901234007",
        boxCode: "BOX-07",
        boxName: "Lockship Box #07 (Nguyễn Văn Linh)",
        address: "Số 64 Nguyễn Văn Linh, P. Hưng Lợi, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0218, lng: 105.7612 },
        usagesCount: 1,
        status: "UNPAID",
        dates: [
            { day: "12", time: "14:20", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-7071" },
        ],
    },
    {
        stt: 8,
        name: "Diệp Phát",
        email: "phat.diep@lockship.vn",
        phone: "0901234008",
        boxCode: "BOX-08",
        boxName: "Lockship Box #08 (KDC Hưng Phú)",
        address: "KDC Hưng Phú 1, P. Hưng Phú, Q. Cái Răng, Cần Thơ",
        location: { lat: 10.0152, lng: 105.7854 },
        usagesCount: 2,
        status: "UNPAID",
        dates: [
            { day: "06", time: "10:00", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-8081" },
            { day: "20", time: "15:45", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-8082" },
        ],
    },
    {
        stt: 9,
        name: "Bùi Ngọc Yến Linh",
        email: "linh.bny@lockship.vn",
        phone: "0901234009",
        boxCode: "BOX-09",
        boxName: "Lockship Box #09 (Cách Mạng Tháng 8)",
        address: "Số 150 Cách Mạng Tháng 8, P. Bùi Hữu Nghĩa, Q. Bình Thủy, Cần Thơ",
        location: { lat: 10.0567, lng: 105.7698 },
        usagesCount: 4,
        status: "UNPAID",
        dates: [
            { day: "03", time: "11:00", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-9091" },
            { day: "10", time: "16:20", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-9092" },
            { day: "17", time: "08:45", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-9093" },
            { day: "25", time: "14:30", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-9094" },
        ],
    },
    {
        stt: 10,
        name: "Nguyễn Hữu Thành",
        email: "thanh.nh@lockship.vn",
        phone: "0901234010",
        boxCode: "BOX-10",
        boxName: "Lockship Box #10 (Lê Bình)",
        address: "Số 39 Lê Bình, P. Hưng Lợi, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0189, lng: 105.7674 },
        usagesCount: 2,
        status: "UNPAID",
        dates: [
            { day: "09", time: "13:15", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-1001" },
            { day: "23", time: "17:00", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-1002" },
        ],
    },
    {
        stt: 11,
        name: "Lê Châu Bảo Ngân",
        email: "ngan.lcb@lockship.vn",
        phone: "0901234011",
        boxCode: "BOX-11",
        boxName: "Lockship Box #11 (Lý Tự Trọng)",
        address: "Số 75 Lý Tự Trọng, P. An Phú, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0356, lng: 105.7791 },
        usagesCount: 5,
        status: "PENDING_VERIFICATION",
        proofNote: "Đã chuyển khoản MoMo 25.000đ lúc 10:30 sáng nay với cú pháp LOCKSHIP LECHAUBAONGAN 202611.",
        dates: [
            { day: "02", time: "08:15", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-1111" },
            { day: "07", time: "13:40", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-1112" },
            { day: "14", time: "17:30", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-1113" },
            { day: "20", time: "11:10", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-1114" },
            { day: "26", time: "15:45", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-1115" },
        ],
    },
    {
        stt: 12,
        name: "Bùi Tú Anh",
        email: "anh.bt@lockship.vn",
        phone: "0901234012",
        boxCode: "BOX-12",
        boxName: "Lockship Box #12 (Đường 3 Tháng 2)",
        address: "Số 210 Đường 3/2, P. Hưng Lợi, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0245, lng: 105.7645 },
        usagesCount: 3,
        status: "UNPAID",
        dates: [
            { day: "05", time: "10:30", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-1221" },
            { day: "14", time: "15:00", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-1222" },
            { day: "23", time: "18:15", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-1223" },
        ],
    },
    {
        stt: 13,
        name: "Nguyễn Hữu Nghĩa",
        email: "nghia.nh@lockship.vn",
        phone: "0901234013",
        boxCode: "BOX-13",
        boxName: "Lockship Box #13 (Trần Văn Khéo)",
        address: "Số 50 Trần Văn Khéo, P. Cái Khế, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0478, lng: 105.7865 },
        usagesCount: 4,
        status: "UNPAID",
        dates: [
            { day: "04", time: "09:10", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-1331" },
            { day: "12", time: "14:45", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-1332" },
            { day: "19", time: "16:30", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-1333" },
            { day: "27", time: "11:20", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-1334" },
        ],
    },
    {
        stt: 14,
        name: "Huỳnh Thúy Duy",
        email: "duy.ht@lockship.vn",
        phone: "0901234014",
        boxCode: "BOX-14",
        boxName: "Lockship Box #14 (Minh Khai)",
        address: "Số 32 Nguyễn Thị Minh Khai, P. An Lạc, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0389, lng: 105.7878 },
        usagesCount: 5,
        status: "PAID",
        proofNote: "Admin đã xác nhận đối soát khớp lệnh MoMo thành công.",
        paidAt: new Date("2026-11-25T16:00:00.000Z"),
        dates: [
            { day: "01", time: "10:00", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-1441" },
            { day: "06", time: "14:15", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-1442" },
            { day: "12", time: "16:40", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-1443" },
            { day: "18", time: "09:30", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-1444" },
            { day: "24", time: "15:20", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-1445" },
        ],
    },
    {
        stt: 15,
        name: "Nguyễn Ngọc Thiện",
        email: "thien.nn@lockship.vn",
        phone: "0901234015",
        boxCode: "BOX-15",
        boxName: "Lockship Box #15 (Đường 30 Tháng 4)",
        address: "Số 125 Đường 30/4, P. An Phú, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0302, lng: 105.7761 },
        usagesCount: 5,
        status: "UNPAID",
        dates: [
            { day: "03", time: "08:45", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-1551" },
            { day: "09", time: "13:20", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-1552" },
            { day: "15", time: "17:15", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-1553" },
            { day: "22", time: "10:50", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202611-1554" },
            { day: "28", time: "16:40", action: "DELIVERED_TO_LOCKER", ord: "ORD-202611-1555" },
        ],
    },
];

const WAREHOUSE_BOXES = [
    {
        boxId: "BOX-16",
        code: "BOX-16",
        name: "Lockship Box #16 (Kho Trung Tâm Ninh Kiều)",
        totalCompartments: 12,
        availableCompartments: 12,
        battery: 100,
        status: "AVAILABLE",
        lockStatus: "locked",
        registrationStatus: "UNASSIGNED",
        ownerId: null,
        requestedAddress: null,
        requestedNote: "",
        address: null,
        location: { lat: null, lng: null },
        isOnline: true,
        description: "Tủ khóa Lockship thông minh tiêu chuẩn 12 ngăn sẵn sàng lắp đặt",
    },
    {
        boxId: "BOX-17",
        code: "BOX-17",
        name: "Lockship Box #17 (Kho Nam Cần Thơ)",
        totalCompartments: 16,
        availableCompartments: 16,
        battery: 100,
        status: "AVAILABLE",
        lockStatus: "locked",
        registrationStatus: "UNASSIGNED",
        ownerId: null,
        requestedAddress: null,
        requestedNote: "",
        address: null,
        location: { lat: null, lng: null },
        isOnline: true,
        description: "Tủ khóa Lockship dung tích lớn 16 ngăn sẵn sàng lắp đặt",
    },
    {
        boxId: "BOX-18",
        code: "BOX-18",
        name: "Lockship Box #18 (Kho Cái Răng)",
        totalCompartments: 12,
        availableCompartments: 12,
        battery: 100,
        status: "AVAILABLE",
        lockStatus: "locked",
        registrationStatus: "UNASSIGNED",
        ownerId: null,
        requestedAddress: null,
        requestedNote: "",
        address: null,
        location: { lat: null, lng: null },
        isOnline: true,
        description: "Tủ khóa Lockship thông minh tiêu chuẩn 12 ngăn sẵn sàng lắp đặt",
    },
    {
        boxId: "BOX-19",
        code: "BOX-19",
        name: "Lockship Box #19 (Kho Bình Thủy)",
        totalCompartments: 12,
        availableCompartments: 12,
        battery: 100,
        status: "AVAILABLE",
        lockStatus: "locked",
        registrationStatus: "UNASSIGNED",
        ownerId: null,
        requestedAddress: null,
        requestedNote: "",
        address: null,
        location: { lat: null, lng: null },
        isOnline: true,
        description: "Tủ khóa Lockship thông minh tiêu chuẩn 12 ngăn sẵn sàng lắp đặt",
    },
];

async function main() {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(uri);
    console.log("Connected successfully to Atlas!");

    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");
    const boxesCollection = db.collection("boxes");
    const invoicesCollection = db.collection("monthlyinvoices");

    // Unified default password hash for "123456" / "Lockship@123"
    const hashedPassword = await bcrypt.hash("Lockship@123", 10);
    const currentMonth = "2026-11";

    console.log(`\n=== 1. SEEDING 15 OWNERS & ASSIGNED BOXES ===`);

    for (const item of SEED_OWNERS) {
        // A. Upsert User (role: 'owner')
        let user = await usersCollection.findOne({ email: item.email.toLowerCase() });
        if (!user) {
            const insertUserResult = await usersCollection.insertOne({
                name: item.name,
                email: item.email.toLowerCase(),
                password: hashedPassword,
                phone: item.phone,
                address: item.address,
                role: "owner",
                status: "active",
                isEmailVerified: true,
                authProvider: "local",
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            user = await usersCollection.findOne({ _id: insertUserResult.insertedId });
            console.log(`[+] Created Owner: ${item.name} (${item.email})`);
        } else {
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        name: item.name,
                        phone: item.phone,
                        address: item.address,
                        role: "owner",
                        status: "active",
                        updatedAt: new Date(),
                    },
                }
            );
            console.log(`[*] Updated Owner: ${item.name} (${item.email})`);
        }

        // B. Upsert Box (matching boxCode e.g. BOX-01, BOX-02...)
        const { qrUrl, qrImageUrl } = buildQrMetadata(item.boxCode);
        let box = await boxesCollection.findOne({
            $or: [{ boxId: item.boxCode }, { code: item.boxCode }],
        });

        if (!box) {
            const insertBoxResult = await boxesCollection.insertOne({
                boxId: item.boxCode,
                code: item.boxCode,
                name: item.boxName,
                ownerId: user._id,
                registrationStatus: "ACTIVE",
                status: "AVAILABLE",
                lockStatus: "locked",
                pinCode: "123456",
                address: item.address,
                location: item.location,
                totalCompartments: 12,
                availableCompartments: 8,
                battery: 95,
                isOnline: true,
                qrUrl,
                qrImageUrl,
                installedAt: new Date("2026-10-15T08:00:00Z"),
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            box = await boxesCollection.findOne({ _id: insertBoxResult.insertedId });
            console.log(`[+] Created Box ${item.boxCode} -> Owner ${item.name}`);
        } else {
            await boxesCollection.updateOne(
                { _id: box._id },
                {
                    $set: {
                        boxId: item.boxCode,
                        code: item.boxCode,
                        name: item.boxName,
                        ownerId: user._id,
                        registrationStatus: "ACTIVE",
                        status: "AVAILABLE",
                        address: item.address,
                        location: item.location,
                        qrUrl: box.qrUrl || qrUrl,
                        qrImageUrl: box.qrImageUrl || qrImageUrl,
                        updatedAt: new Date(),
                    },
                }
            );
            console.log(`[*] Updated Box ${item.boxCode} -> Owner ${item.name}`);
        }

        // C. Upsert MonthlyInvoice for 2026-11 with SPACED OUT usageHistory dates
        const totalAmount = item.usagesCount * 5000;
        const transferSyntax = generateTransferSyntax(item.name, currentMonth);

        // Build spaced usageHistory entries strictly according to spacing rule
        const usageHistory = item.dates.map((d, index) => ({
            boxId: item.boxCode,
            boxName: item.boxName,
            boxAddress: item.address,
            actionType: d.action,
            orderReference: d.ord,
            cost: 5000,
            usedAt: new Date(`2026-11-${d.day}T${d.time}:00.000Z`),
        }));

        const existingInvoice = await invoicesCollection.findOne({
            ownerId: user._id,
            month: currentMonth,
        });

        if (!existingInvoice) {
            await invoicesCollection.insertOne({
                ownerId: user._id,
                month: currentMonth,
                totalUsages: item.usagesCount,
                unitPrice: 5000,
                totalAmount,
                usageHistory,
                paymentStatus: item.status,
                transferSyntax,
                paymentProofNote: item.proofNote || "",
                paidAt: item.paidAt || null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            console.log(
                `[+] Created Invoice for ${item.name}: ${item.usagesCount} usages (${totalAmount}đ), Status: ${item.status}`
            );
        } else {
            await invoicesCollection.updateOne(
                { _id: existingInvoice._id },
                {
                    $set: {
                        totalUsages: item.usagesCount,
                        unitPrice: 5000,
                        totalAmount,
                        usageHistory,
                        paymentStatus: item.status,
                        transferSyntax,
                        paymentProofNote: item.proofNote || "",
                        paidAt: item.paidAt || null,
                        updatedAt: new Date(),
                    },
                }
            );
            console.log(
                `[*] Updated Invoice for ${item.name}: ${item.usagesCount} usages (${totalAmount}đ), Status: ${item.status}`
            );
        }
    }

    console.log(`\n=== 2. SEEDING 4 WAREHOUSE UNASSIGNED BOXES (BOX-16 .. BOX-19) ===`);

    for (const wb of WAREHOUSE_BOXES) {
        const { qrUrl, qrImageUrl } = buildQrMetadata(wb.boxId);
        const existing = await boxesCollection.findOne({
            $or: [{ boxId: wb.boxId }, { code: wb.code }],
        });

        if (!existing) {
            await boxesCollection.insertOne({
                ...wb,
                qrUrl,
                qrImageUrl,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            console.log(`[+] Created Warehouse Box: ${wb.boxId} (${wb.name}) [UNASSIGNED]`);
        } else {
            await boxesCollection.updateOne(
                { _id: existing._id },
                {
                    $set: {
                        registrationStatus: "UNASSIGNED",
                        ownerId: null,
                        requestedAddress: null,
                        status: "AVAILABLE",
                        qrUrl: existing.qrUrl || qrUrl,
                        qrImageUrl: existing.qrImageUrl || qrImageUrl,
                        updatedAt: new Date(),
                    },
                }
            );
            console.log(`[*] Verified Warehouse Box: ${wb.boxId} [UNASSIGNED]`);
        }
    }

    console.log(`\n=== VERIFYING SUMMARY ON ATLAS ===`);
    const totalOwners = await usersCollection.countDocuments({ role: "owner" });
    const totalActiveBoxes = await boxesCollection.countDocuments({ registrationStatus: "ACTIVE" });
    const totalUnassignedBoxes = await boxesCollection.countDocuments({ registrationStatus: "UNASSIGNED" });
    const totalInvoices = await invoicesCollection.countDocuments({ month: currentMonth });

    console.log(`Total Owners: ${totalOwners}`);
    console.log(`Total Active Boxes: ${totalActiveBoxes}`);
    console.log(`Total Unassigned Boxes in Warehouse: ${totalUnassignedBoxes}`);
    console.log(`Total Invoices for ${currentMonth}: ${totalInvoices}`);

    console.log("\n=== SEED COMPLETED SUCCESSFULLY! ===");
    await mongoose.disconnect();
}

main().catch(console.error);
