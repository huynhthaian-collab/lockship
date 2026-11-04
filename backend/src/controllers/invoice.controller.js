import * as billingService from "../services/billing.service.js";

/**
 * Get current monthly invoice for authenticated Owner
 */
export async function getCurrentInvoice(req, res, next) {
    try {
        const { month } = req.query;
        const result = await billingService.getOwnerCurrentInvoice(req.user.id, month);
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get invoice history for authenticated Owner
 */
export async function getInvoiceHistory(req, res, next) {
    try {
        const invoices = await billingService.getOwnerInvoiceHistory(req.user.id);
        res.status(200).json({
            success: true,
            data: { invoices },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Owner reports payment completed via MoMo
 */
export async function notifyPaid(req, res, next) {
    try {
        const { invoiceId } = req.params;
        const invoice = await billingService.notifyInvoicePaid(invoiceId, req.user.id, req.body);
        res.status(200).json({
            success: true,
            message: "Đã gửi thông báo thanh toán thành công! Vui lòng chờ Admin kiểm tra và xác nhận.",
            data: { invoice },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * List all invoices for Admin with metrics and filters
 */
export async function getAdminInvoices(req, res, next) {
    try {
        const { month, status, search } = req.query;
        const result = await billingService.getAdminInvoices({ month, status, search });
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Admin verifies and approves invoice payment
 */
export async function verifyPayment(req, res, next) {
    try {
        const { invoiceId } = req.params;
        const { note } = req.body;
        const invoice = await billingService.verifyInvoicePayment(invoiceId, req.user.id, { note });
        res.status(200).json({
            success: true,
            message: "Xác nhận nhận tiền và duyệt thanh toán cước thành công!",
            data: { invoice },
        });
    } catch (error) {
        next(error);
    }
}
