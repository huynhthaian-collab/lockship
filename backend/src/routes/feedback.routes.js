import { Router } from "express";
import * as feedbackController from "../controllers/feedback.controller.js";
import { optionalAuthenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", optionalAuthenticate, feedbackController.createFeedback);
router.get("/", feedbackController.listFeedbacks);

export default router;
