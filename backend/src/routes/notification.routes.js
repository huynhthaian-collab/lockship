import { Router } from "express";
import { param } from "express-validator";
import * as notificationController from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/", notificationController.listNotifications);
router.put(
    "/read-all",
    notificationController.markAllNotificationsRead,
);
router.put(
    "/:id/read",
    param("id").isMongoId().withMessage("A valid notification ID is required."),
    validateRequest,
    notificationController.markNotificationRead,
);

export default router;