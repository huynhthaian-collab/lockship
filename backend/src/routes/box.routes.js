import { Router } from "express";
import * as boxController from "../controllers/box.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/authorize.middleware.js";

const router = Router();

// BẮT BUỘC BẢO VỆ: Chỉ Admin mới được phép thao tác với các API quản lý và cấp phát mã QR tủ khóa
router.use(protect);
router.use(restrictTo("admin"));

// POST /api/boxes - Tạo mới tủ khóa kèm cấp phát mã QR (Admin only)
router.post("/", boxController.createBox);

// GET /api/boxes - Danh sách tủ khóa kèm mã QR (Admin only)
router.get("/", boxController.listBoxes);

// POST /api/boxes/:id/generate-qr - Cấp phát / tạo lại mã QR cho tủ khóa (Admin only)
router.post("/:id/generate-qr", boxController.generateBoxQr);

// GET /api/boxes/:id/qr - Lấy mã QR của tủ khóa (Admin only)
router.get("/:id/qr", boxController.getBoxQr);

export default router;
