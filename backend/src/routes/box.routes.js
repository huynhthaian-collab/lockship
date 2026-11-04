import { Router } from "express";
import * as boxController from "../controllers/box.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/authorize.middleware.js";

const router = Router();

// Protect all box routes
router.use(protect);

// --- Owner-accessible endpoints ---
// GET /api/boxes/available - Danh sách tủ khóa có sẵn trong kho chờ đăng ký
router.get("/available", restrictTo("owner", "admin"), boxController.listAvailableBoxes);

// GET /api/boxes/my-boxes - Danh sách tủ khóa của Owner đang đăng nhập
router.get("/my-boxes", restrictTo("owner", "admin"), boxController.listMyBoxes);

// POST /api/boxes/:boxId/request-registration - Owner gửi yêu cầu đăng ký lắp đặt Box (bắt buộc nhập địa chỉ)
router.post("/:boxId/request-registration", restrictTo("owner", "admin"), boxController.requestBoxRegistration);

// --- Admin-only endpoints ---
router.use(restrictTo("admin"));

// GET /api/boxes/pending-installations - Danh sách yêu cầu chờ duyệt lắp đặt
router.get("/pending-installations", boxController.adminListPendingBoxes);

// PATCH /api/boxes/:id/confirm-installation - Admin duyệt, hiệu chỉnh địa chỉ và gắn tọa độ GPS kích hoạt tủ
router.patch("/:id/confirm-installation", boxController.confirmInstallation);

// POST /api/boxes - Tạo mới tủ khóa kèm cấp phát mã QR (Admin only)
router.post("/", boxController.createBox);

// GET /api/boxes - Danh sách tủ khóa kèm mã QR (Admin only)
router.get("/", boxController.listBoxes);

// POST /api/boxes/:id/generate-qr - Cấp phát / tạo lại mã QR cho tủ khóa (Admin only)
router.post("/:id/generate-qr", boxController.generateBoxQr);

// GET /api/boxes/:id/qr - Lấy mã QR của tủ khóa (Admin only)
router.get("/:id/qr", boxController.getBoxQr);

export default router;
