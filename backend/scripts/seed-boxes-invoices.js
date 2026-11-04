import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import mongoose from "mongoose";

const uri =
    process.env.MONGODB_URI ||
    "mongodb+srv://huynhthaian18112004_db_user:f8MFNOdLw4DZzcan@cluster0.qagzliz.mongodb.net/lockship?retryWrites=true&w=majority&appName=Cluster0";

function buildQrMetadata(boxId) {
    const baseHost = "https://lockship-gamma.vercel.app";
    const qrUrl = `${baseHost}/public/box-scan/${boxId}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrUrl)}`;
    return { qrUrl, qrImageUrl };
}

async function runSafeSeed() {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(uri);
    console.log("Connected successfully!");

    const db = mongoose.connection.db;
    const boxesCollection = db.collection("boxes");
    const usersCollection = db.collection("users");
    const invoicesCollection = db.collection("monthlyinvoices");

    // 1. Update existing boxes to registrationStatus: 'ACTIVE' if not set
    console.log("Checking and normalizing existing boxes...");
    const updateResult = await boxesCollection.updateMany(
        {
            ownerId: { $ne: null },
            $or: [{ registrationStatus: { $exists: false } }, { registrationStatus: null }],
        },
        {
            $set: {
                registrationStatus: "ACTIVE",
                status: "AVAILABLE",
            },
        }
    );
    console.log(`Updated ${updateResult.modifiedCount} existing boxes to registrationStatus: 'ACTIVE'.`);

    // 2. Ensure unassigned warehouse boxes exist for demoing registration flow
    const warehouseBoxes = [
        {
            boxId: "LOCKSHIP-BOX-015",
            code: "BOX-015",
            name: "Lockship Box #15 (Kho Tân An)",
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
            boxId: "LOCKSHIP-BOX-016",
            code: "BOX-016",
            name: "Lockship Box #16 (Kho Xuân Khánh)",
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
            boxId: "LOCKSHIP-BOX-017",
            code: "BOX-017",
            name: "Lockship Box #17 (Kho Cái Răng)",
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

    for (const wb of warehouseBoxes) {
        const existing = await boxesCollection.findOne({ boxId: wb.boxId });
        if (!existing) {
            const { qrUrl, qrImageUrl } = buildQrMetadata(wb.boxId);
            await boxesCollection.insertOne({
                ...wb,
                qrUrl,
                qrImageUrl,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            console.log(`Created warehouse box ${wb.boxId} (UNASSIGNED)`);
        } else {
            console.log(`Warehouse box ${wb.boxId} already exists.`);
        }
    }

    // 3. Seed sample MonthlyInvoices for current month (2026-11)
    const currentMonth = "2026-11";
    const owners = await usersCollection.find({ role: "owner" }).limit(5).toArray();
    console.log(`Found ${owners.length} owners for sample billing invoice check...`);

    const statuses = ["UNPAID", "PENDING_VERIFICATION", "PAID"];
    let idx = 0;

    for (const owner of owners) {
        const existingInvoice = await invoicesCollection.findOne({
            ownerId: owner._id,
            month: currentMonth,
        });

        if (!existingInvoice) {
            const usagesCount = 6 + idx * 3; // 6, 9, 12, 15, ...
            const unitPrice = 5000;
            const totalAmount = usagesCount * unitPrice;
            const assignedStatus = statuses[idx % statuses.length];

            const cleanName = (owner.name || "OWNER")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^A-Za-z0-9]/g, "")
                .toUpperCase();
            const transferSyntax = `LOCKSHIP ${cleanName} 202611`;

            // Build realistic usageHistory entries
            const usageHistory = [];
            for (let i = 1; i <= usagesCount; i++) {
                const day = Math.min(i * 3, 28);
                usageHistory.push({
                    boxId: `LOCKSHIP-BOX-00${(idx % 14) + 1}`,
                    boxName: `Lockship Box #${(idx % 14) + 1}`,
                    boxAddress: owner.address || "Ninh Kiều, Cần Thơ",
                    actionType: i % 2 === 0 ? "ORDER_DELIVERED" : "GUEST_QR_ACCESS",
                    orderReference: `LS-${1000 + i}`,
                    cost: unitPrice,
                    usedAt: new Date(`2026-11-${String(day).padStart(2, "0")}T10:30:00Z`),
                });
            }

            await invoicesCollection.insertOne({
                ownerId: owner._id,
                month: currentMonth,
                totalUsages: usagesCount,
                unitPrice,
                totalAmount,
                usageHistory,
                paymentStatus: assignedStatus,
                transferSyntax,
                paymentProofNote:
                    assignedStatus === "PENDING_VERIFICATION"
                        ? "Đã chuyển khoản MoMo 45.000đ lúc 09:15 sáng nay."
                        : "",
                paidAt: assignedStatus === "PAID" ? new Date("2026-11-03T14:20:00Z") : null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            console.log(
                `Created sample invoice for ${owner.name}: ${usagesCount} usages, ${totalAmount} VND, status: ${assignedStatus}`
            );
        } else {
            console.log(`Invoice for ${owner.name} (${currentMonth}) already exists.`);
        }
        idx++;
    }

    console.log("Safe seed completed successfully!");
    await mongoose.disconnect();
}

runSafeSeed().catch(console.error);
