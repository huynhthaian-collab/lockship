import { Router } from "express";
import { body, param } from "express-validator";
import * as boxAccessController from "../controllers/box-access.controller.js";
import { validateRequest } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/:boxId/info", boxAccessController.getBoxInfo);

router.post(
    "/:boxId/request-access",
    [
        param("boxId").isString().trim().notEmpty().withMessage("Box ID là bắt buộc."),
        body("shipperPhone").isString().trim().isLength({ min: 8, max: 20 }).withMessage("Số điện thoại shipper phải từ 8 đến 20 ký tự."),
        body("shipperName").optional().isString().trim().isLength({ max: 120 }),
        body("deliverySource").optional().isString().trim().isLength({ max: 120 }),
        body("packageDescription").optional().isString().trim().isLength({ max: 500 }),
    ],
    validateRequest,
    boxAccessController.requestAccess,
);

router.get(
    "/:boxId/request-status/:requestId",
    [
        param("boxId").isString().trim().notEmpty().withMessage("Box ID là bắt buộc."),
        param("requestId").isMongoId().withMessage("Mã yêu cầu không hợp lệ."),
    ],
    validateRequest,
    boxAccessController.getRequestStatus,
);

export default router;
