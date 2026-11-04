import { Router } from "express";
import * as invoiceController from "../controllers/invoice.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/authorize.middleware.js";

const router = Router();

router.use(protect);

// --- Owner Invoice Routes ---
router.get("/current", restrictTo("owner", "admin"), invoiceController.getCurrentInvoice);
router.get("/history", restrictTo("owner", "admin"), invoiceController.getInvoiceHistory);
router.post("/:invoiceId/notify-paid", restrictTo("owner", "admin"), invoiceController.notifyPaid);

// --- Admin Invoice Routes (works with /api/admin/invoices and /api/invoices/admin) ---
router.get("/admin", restrictTo("admin"), invoiceController.getAdminInvoices);
router.get("/", restrictTo("admin"), invoiceController.getAdminInvoices);
router.patch("/admin/:invoiceId/verify-payment", restrictTo("admin"), invoiceController.verifyPayment);
router.patch("/:invoiceId/verify-payment", restrictTo("admin"), invoiceController.verifyPayment);

export default router;
