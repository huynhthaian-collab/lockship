import mongoose from "mongoose";
import Box from "../models/box.model.js";
import MonthlyInvoice from "../models/monthly-invoice.model.js";
import User from "../models/user.model.js";
import IoTEvent from "../models/iot-event.model.js";
import AppError from "../utils/app-error.js";
import { createNotification } from "./notification.service.js";
import { emitToUser, broadcastSocket } from "./socket.service.js";

export const MOMO_PHONE = "0909000001";
export const MOMO_RECIPIENT_NAME = "LOCKSHIP";

export const BIDV_BANK = "BIDV";
export const BIDV_ACCOUNT_NO = "6910924374";
export const BIDV_ACCOUNT_NAME = "TRAN THI THUY QUYEN";
export const BIDV_BRANCH = "PGD Thanh Bình";

function getCurrentMonthString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

export function generateTransferSyntax(ownerName, monthString = "2026-10") {
    const cleanName = (ownerName || "OWNER")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9\s]/g, "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();

    let monthTag = "T10";
    if (monthString && typeof monthString === "string") {
        if (/^T\d+$/i.test(monthString.trim())) {
            monthTag = monthString.trim().toUpperCase();
        } else {
            const parts = monthString.split("-");
            const m = parts.length > 1 ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
            if (!isNaN(m) && m >= 1 && m <= 12) {
                monthTag = `T${m}`;
            }
        }
    }
    return `LOCKSHIP ${cleanName} ${monthTag}`;
}

/**
 * Record a valid locker box usage (5.000 VNĐ) into the owner's monthly invoice.
 */
export async function recordBoxUsage({
    boxId,
    ownerId,
    actionType = "ORDER_DELIVERED",
    orderReference = "",
    cost = 5000,
    details = {},
}) {
    try {
        if (mongoose.connection.readyState !== 1) {
            return null;
        }

        const cleanBoxId = String(boxId || "").trim();
        let targetBox = null;

        if (cleanBoxId) {
            targetBox = await Box.findOne({
                $or: [
                    { boxId: { $regex: new RegExp(`^${cleanBoxId}$`, "i") } },
                    { code: { $regex: new RegExp(`^${cleanBoxId}$`, "i") } },
                    ...(mongoose.isValidObjectId(cleanBoxId) ? [{ _id: cleanBoxId }] : []),
                ],
            });
        }

        // Only charge for boxes that are ACTIVE and have an assigned owner
        if (targetBox && targetBox.registrationStatus !== "ACTIVE") {
            return null;
        }

        const resolvedOwnerId = targetBox?.ownerId || ownerId;
        if (!resolvedOwnerId || !mongoose.isValidObjectId(resolvedOwnerId)) {
            return null;
        }

        const owner = await User.findById(resolvedOwnerId).select("name email phone");
        if (!owner) {
            return null;
        }

        const month = getCurrentMonthString();
        const transferSyntax = generateTransferSyntax(owner.name, month);

        let invoice = await MonthlyInvoice.findOne({
            ownerId: resolvedOwnerId,
            month,
        });

        if (!invoice) {
            invoice = new MonthlyInvoice({
                ownerId: resolvedOwnerId,
                month,
                totalUsages: 0,
                unitPrice: cost || 5000,
                totalAmount: 0,
                usageHistory: [],
                paymentStatus: "UNPAID",
                transferSyntax,
            });
        }

        const usageEntry = {
            boxId: targetBox?.boxId || cleanBoxId || "UNKNOWN-BOX",
            boxName: targetBox?.name || `Lockship Box #${cleanBoxId}`,
            boxAddress: targetBox?.address || targetBox?.requestedAddress || "Trạm tủ thông minh Lockship",
            actionType,
            orderReference: orderReference || `USAGE-${Date.now().toString(36).toUpperCase()}`,
            cost: cost || 5000,
            usedAt: new Date(),
        };

        invoice.usageHistory.push(usageEntry);
        invoice.totalUsages = invoice.usageHistory.length;
        invoice.totalAmount = invoice.totalUsages * (invoice.unitPrice || 5000);
        if (!invoice.transferSyntax) {
            invoice.transferSyntax = transferSyntax;
        }

        await invoice.save();

        // Audit log in IoTEvent
        try {
            await IoTEvent.create({
                deviceId: usageEntry.boxId,
                eventType: "billing_fee_charged",
                payload: {
                    ownerId: resolvedOwnerId,
                    month,
                    cost: usageEntry.cost,
                    actionType,
                    orderReference: usageEntry.orderReference,
                    totalUsages: invoice.totalUsages,
                    totalAmount: invoice.totalAmount,
                    ...details,
                },
            });
        } catch (logErr) {
            // Non-blocking logging error
        }

        // Real-time dispatch to owner's socket room
        emitToUser(resolvedOwnerId, "billing:usage_recorded", {
            invoiceId: invoice._id,
            month,
            totalUsages: invoice.totalUsages,
            totalAmount: invoice.totalAmount,
            newUsage: usageEntry,
            paymentStatus: invoice.paymentStatus,
        });

        return invoice;
    } catch (error) {
        console.error("Error recording box usage fee:", error);
        return null;
    }
}

/**
 * Get current monthly invoice for an owner.
 */
export async function getOwnerCurrentInvoice(ownerId, requestedMonth) {
    if (!mongoose.isValidObjectId(ownerId)) {
        throw new AppError("Invalid Owner ID.", 400);
    }

    const month = requestedMonth || "2026-10";
    let invoice = null;
    let owner = null;

    if (mongoose.connection.readyState === 1) {
        try {
            invoice = await MonthlyInvoice.findOne({ ownerId, month });
            owner = await User.findById(ownerId).select("name email phone");
        } catch (err) {
            // fallback
        }
    }

    const defaultSyntax = generateTransferSyntax(owner?.name, month);

    if (!invoice) {
        invoice = {
            ownerId,
            month,
            totalUsages: 0,
            unitPrice: 5000,
            totalAmount: 0,
            usageHistory: [],
            paymentStatus: "UNPAID",
            transferSyntax: defaultSyntax,
            paidAt: null,
            paymentProofNote: "",
            isVirtual: true,
        };
    }

    const currentSyntax = invoice.transferSyntax || defaultSyntax;
    const cleanAmount = invoice.totalAmount || 0;

    const qrUrl = `2|99|${MOMO_PHONE}|${MOMO_RECIPIENT_NAME}|info@lockship.vn|0|0|${cleanAmount}|${currentSyntax}|transfer_mycode`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}`;

    const vietqrUrl = `https://img.vietqr.io/image/BIDV-${BIDV_ACCOUNT_NO}-compact2.png?amount=${cleanAmount}&addInfo=${encodeURIComponent(currentSyntax)}&accountName=${encodeURIComponent(BIDV_ACCOUNT_NAME)}`;

    return {
        invoice,
        momoConfig: {
            phone: MOMO_PHONE,
            accountName: MOMO_RECIPIENT_NAME,
            qrUrl,
            qrImageUrl,
        },
        vietqrConfig: {
            bankId: BIDV_BANK,
            bankName: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)",
            branch: BIDV_BRANCH,
            accountNo: BIDV_ACCOUNT_NO,
            accountName: BIDV_ACCOUNT_NAME,
            qrImageUrl: vietqrUrl,
            transferSyntax: currentSyntax,
            amount: cleanAmount,
        },
    };
}

/**
 * Get all monthly invoices history for an owner.
 */
export async function getOwnerInvoiceHistory(ownerId) {
    if (!mongoose.isValidObjectId(ownerId)) {
        throw new AppError("Invalid Owner ID.", 400);
    }

    if (mongoose.connection.readyState !== 1) {
        return [];
    }

    const invoices = await MonthlyInvoice.find({ ownerId }).sort({ month: -1 });
    return invoices;
}

/**
 * Owner reports payment made via VietQR / MoMo.
 */
export async function notifyInvoicePaid(invoiceId, ownerId, { paymentProofNote = "" } = {}) {
    if (!mongoose.isValidObjectId(invoiceId)) {
        throw new AppError("Mã hóa đơn không hợp lệ.", 400);
    }

    if (mongoose.connection.readyState !== 1) {
        return {
            _id: invoiceId,
            paymentStatus: "PENDING_VERIFICATION",
            paidAt: new Date(),
        };
    }

    const invoice = await MonthlyInvoice.findOne({ _id: invoiceId, ownerId });
    if (!invoice) {
        throw new AppError("Không tìm thấy hóa đơn cần thanh toán.", 404);
    }

    if (invoice.paymentStatus === "PAID") {
        throw new AppError("Hóa đơn này đã được xác nhận thanh toán trước đó.", 400);
    }

    invoice.paymentStatus = "PENDING_VERIFICATION";
    invoice.paidAt = new Date();
    if (paymentProofNote) {
        invoice.paymentProofNote = paymentProofNote.trim();
    }
    await invoice.save();

    const owner = await User.findById(ownerId).select("name email phone");

    // Create notification for admin
    try {
        const admins = await User.find({ role: "admin", status: "active" }).select("_id");
        for (const admin of admins) {
            await createNotification({
                userId: admin._id,
                type: "invoice_payment_pending",
                title: "Chủ tủ báo đã thanh toán cước",
                message: `Chủ tủ ${owner?.name || "Owner"} vừa báo thanh toán cước tháng ${invoice.month} (${invoice.totalAmount.toLocaleString("vi-VN")} đ) qua VietQR BIDV. Vui lòng đối soát và duyệt.`,
                isRead: false,
            });
        }
    } catch (e) {
        // Non-blocking
    }

    // Broadcast to admins
    broadcastSocket("admin:invoice_pending", {
        invoiceId: invoice._id,
        ownerId,
        ownerName: owner?.name,
        month: invoice.month,
        totalAmount: invoice.totalAmount,
        status: invoice.paymentStatus,
    });

    return invoice;
}

/**
 * List all invoices for Admin with filters.
 */
export async function getAdminInvoices({ month, status, search = "" } = {}) {
    if (mongoose.connection.readyState !== 1) {
        return {
            invoices: [],
            total: 0,
            summary: {
                totalRevenue: 0,
                totalPaid: 0,
                totalPending: 0,
                totalUnpaid: 0,
                countPaid: 0,
                countPending: 0,
                countUnpaid: 0,
            },
        };
    }

    const filter = {};
    if (month && month !== "ALL") {
        filter.month = month;
    }
    if (status && status !== "ALL") {
        filter.paymentStatus = status;
    }

    const invoices = await MonthlyInvoice.find(filter)
        .populate("ownerId", "name email phone")
        .sort({ month: -1, createdAt: -1 });

    const filteredInvoices = search
        ? invoices.filter((inv) => {
            const name = inv.ownerId?.name || "";
            const email = inv.ownerId?.email || "";
            const phone = inv.ownerId?.phone || "";
            const syntax = inv.transferSyntax || "";
            const q = search.toLowerCase();
            return (
                name.toLowerCase().includes(q) ||
                email.toLowerCase().includes(q) ||
                phone.toLowerCase().includes(q) ||
                syntax.toLowerCase().includes(q)
            );
        })
        : invoices;

    // Summary aggregates
    const summary = {
        totalRevenue: 0,
        totalPaid: 0,
        totalPending: 0,
        totalUnpaid: 0,
        countPaid: 0,
        countPending: 0,
        countUnpaid: 0,
    };

    for (const inv of invoices) {
        summary.totalRevenue += inv.totalAmount || 0;
        if (inv.paymentStatus === "PAID") {
            summary.totalPaid += inv.totalAmount || 0;
            summary.countPaid += 1;
        } else if (inv.paymentStatus === "PENDING_VERIFICATION") {
            summary.totalPending += inv.totalAmount || 0;
            summary.countPending += 1;
        } else {
            summary.totalUnpaid += inv.totalAmount || 0;
            summary.countUnpaid += 1;
        }
    }

    return {
        invoices: filteredInvoices,
        total: filteredInvoices.length,
        summary,
    };
}

/**
 * Admin verifies and marks invoice as PAID.
 */
export async function verifyInvoicePayment(invoiceId, adminId, { note = "" } = {}) {
    if (!mongoose.isValidObjectId(invoiceId)) {
        throw new AppError("Mã hóa đơn không hợp lệ.", 400);
    }

    if (mongoose.connection.readyState !== 1) {
        return {
            _id: invoiceId,
            paymentStatus: "PAID",
            paidAt: new Date(),
        };
    }

    const invoice = await MonthlyInvoice.findById(invoiceId);
    if (!invoice) {
        throw new AppError("Không tìm thấy hóa đơn cần duyệt.", 404);
    }

    invoice.paymentStatus = "PAID";
    invoice.verifiedBy = adminId;
    invoice.verifiedAt = new Date();
    if (!invoice.paidAt) {
        invoice.paidAt = new Date();
    }
    if (note) {
        invoice.paymentProofNote = invoice.paymentProofNote
            ? `${invoice.paymentProofNote} | Admin: ${note.trim()}`
            : `Admin: ${note.trim()}`;
    }

    await invoice.save();

    // Notify owner
    try {
        await createNotification({
            userId: invoice.ownerId,
            type: "invoice_payment_verified",
            title: "Xác nhận thanh toán cước thành công",
            message: `Hóa đơn cước dịch vụ Lockship tháng ${invoice.month} (${invoice.totalAmount.toLocaleString("vi-VN")} đ) của bạn đã được Admin xác nhận thanh toán thành công!`,
            isRead: false,
        });

        emitToUser(invoice.ownerId, "billing:payment_verified", {
            invoiceId: invoice._id,
            month: invoice.month,
            paymentStatus: "PAID",
            paidAt: invoice.paidAt,
            verifiedAt: invoice.verifiedAt,
            totalAmount: invoice.totalAmount,
        });
    } catch (e) {
        // Non-blocking
    }

    return invoice;
}
