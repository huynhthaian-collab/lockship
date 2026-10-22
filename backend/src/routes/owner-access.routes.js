import { Router } from "express";
import { body, param } from "express-validator";
import * as boxAccessController from "../controllers/box-access.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/authorize.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";

const router = Router();

router.use(authenticate);
router.use(authorizeRoles("owner", "admin"));

router.get("/", boxAccessController.listOwnerRequests);

router.patch(
    "/:requestId/respond",
    [
        param("requestId").isMongoId().withMessage("Mã yêu cầu không hợp lệ."),
        body("action").isIn(["APPROVE", "REJECT"]).withMessage("action phải là APPROVE hoặc REJECT."),
        body("orderId").optional({ nullable: true }).isMongoId().withMessage("Mã đơn hàng không hợp lệ."),
        body("notes").optional().isString().trim().isLength({ max: 500 }),
    ],
    validateRequest,
    boxAccessController.respondOwnerRequest,
);

export default router;
