import mongoose from "mongoose";

const usageRecordSchema = new mongoose.Schema(
    {
        boxId: {
            type: String,
            required: true,
            trim: true,
        },
        boxName: {
            type: String,
            trim: true,
            default: "Lockship Smart Locker",
        },
        boxAddress: {
            type: String,
            trim: true,
            default: "",
        },
        actionType: {
            type: String,
            required: true,
            trim: true,
            default: "ORDER_DELIVERED",
        },
        orderReference: {
            type: String,
            trim: true,
            default: "",
        },
        cost: {
            type: Number,
            required: true,
            default: 5000,
            min: 0,
        },
        usedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true },
);

const monthlyInvoiceSchema = new mongoose.Schema(
    {
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        month: {
            type: String,
            required: true,
            trim: true,
            index: true, // format: "YYYY-MM"
        },
        totalUsages: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        unitPrice: {
            type: Number,
            required: true,
            default: 5000, // 5.000 VNĐ per usage
            min: 0,
        },
        totalAmount: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        usageHistory: {
            type: [usageRecordSchema],
            default: [],
        },
        paymentStatus: {
            type: String,
            enum: ["UNPAID", "PENDING_VERIFICATION", "PAID"],
            default: "UNPAID",
            index: true,
        },
        paidAt: {
            type: Date,
            default: null,
        },
        paymentMethod: {
            type: String,
            trim: true,
            default: "VIETQR_BIDV",
        },
        paymentDate: {
            type: Date,
            default: null,
        },
        transferSyntax: {
            type: String,
            trim: true,
            default: "",
        },
        paymentProofNote: {
            type: String,
            trim: true,
            default: "",
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        verifiedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform(_doc, ret) {
                delete ret.__v;
                return ret;
            },
        },
    },
);

monthlyInvoiceSchema.index({ ownerId: 1, month: 1 }, { unique: true });
monthlyInvoiceSchema.index({ month: 1, paymentStatus: 1 });

const MonthlyInvoice =
    mongoose.models.MonthlyInvoice ||
    mongoose.model("MonthlyInvoice", monthlyInvoiceSchema, "monthlyinvoices");

export default MonthlyInvoice;

