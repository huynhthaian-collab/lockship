import { Router } from "express";
import * as feedbackController from "../controllers/feedback.controller.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/authorize.middleware.js";

const router = Router();

// Public routes
router.post("/", optionalAuthenticate, feedbackController.createFeedback);
router.get("/", feedbackController.listFeedbacks);

// Admin-only routes
router.get("/admin", authenticate, authorizeRoles("admin"), feedbackController.listAdminFeedbacks);
router.post("/admin", authenticate, authorizeRoles("admin"), feedbackController.adminCreateFeedback);
router.patch("/:id", authenticate, authorizeRoles("admin"), feedbackController.updateFeedback);
router.delete("/:id", authenticate, authorizeRoles("admin"), feedbackController.deleteFeedback);

export default router;
