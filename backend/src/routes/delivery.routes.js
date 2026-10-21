import { Router } from "express";
import { body, param } from "express-validator";
import * as deliveryController from "../controllers/delivery.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/authorize.middleware.js";
import { unlockRateLimiter } from "../middleware/rate-limit.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";

const router = Router();
const deliveryIdValidation = () => param("id").isMongoId().withMessage("A valid delivery ID is required.");

function deliveryDetailsValidation({ isCreate }) {
    return [
        body("pickupAddress")
        [isCreate ? "exists" : "optional"]()
            .isString()
            .trim()
            .isLength({ min: 3, max: 500 })
            .withMessage("Pickup address must be 3 to 500 characters."),
        body("deliveryAddress")
        [isCreate ? "exists" : "optional"]()
            .isString()
            .trim()
            .isLength({ min: 3, max: 500 })
            .withMessage("Delivery address must be 3 to 500 characters."),
        body("description")
            .optional({ nullable: true })
            .isString()
            .trim()
            .isLength({ max: 2000 })
            .withMessage("Description must be at most 2000 characters."),
        body().custom((value) => {
            const allowedFields = ["pickupAddress", "deliveryAddress", "description"];
            if (!value || typeof value !== "object" || Array.isArray(value)) {
                throw new Error("A JSON object is required.");
            }
            if (isCreate && !["pickupAddress", "deliveryAddress"].every((field) => Object.hasOwn(value, field))) {
                throw new Error("Pickup and delivery addresses are required.");
            }
            if (!isCreate && !Object.keys(value).some((field) => allowedFields.includes(field))) {
                throw new Error("At least one delivery field must be provided.");
            }
            if (Object.keys(value).some((field) => !allowedFields.includes(field))) {
                throw new Error("Only addresses and description can be changed.");
            }
            return true;
        }),
    ];
}

router.use(authenticate);
router.get("/", authorizeRoles("owner", "shipper", "admin"), deliveryController.listDeliveries);
router.get("/issues", authorizeRoles("owner", "shipper", "admin"), deliveryController.listDeliveryIssues);
router.get(
    "/:id/unlock-code",
    authorizeRoles("shipper"),
    deliveryIdValidation(),
    validateRequest,
    deliveryController.getUnlockCode,
);
router.post(
    "/",
    authorizeRoles("owner"),
    deliveryDetailsValidation({ isCreate: true }),
    validateRequest,
    deliveryController.createDelivery,
);
router.get(
    "/:id",
    authorizeRoles("owner", "shipper", "admin"),
    deliveryIdValidation(),
    validateRequest,
    deliveryController.getDelivery,
);
router.put(
    "/:id",
    authorizeRoles("owner"),
    deliveryIdValidation(),
    deliveryDetailsValidation({ isCreate: false }),
    validateRequest,
    deliveryController.updateDelivery,
);
router.post(
    "/:id/assign",
    authorizeRoles("owner"),
    deliveryIdValidation(),
    [
        body("shipperId").isMongoId().withMessage("A valid shipper ID is required."),
        body("vehicleId").isMongoId().withMessage("A valid vehicle ID is required."),
        body().custom((value) => {
            if (!value || typeof value !== "object" || Array.isArray(value)
                || Object.keys(value).some((field) => !["shipperId", "vehicleId"].includes(field))) {
                throw new Error("Only shipperId and vehicleId can be provided.");
            }
            return true;
        }),
    ],
    validateRequest,
    deliveryController.assignDelivery,
);
router.post("/:id/accept", authorizeRoles("shipper"), deliveryIdValidation(), validateRequest, deliveryController.acceptDelivery);
router.post("/:id/start", authorizeRoles("shipper"), deliveryIdValidation(), validateRequest, deliveryController.startDelivery);
router.post("/:id/arrive", authorizeRoles("shipper"), deliveryIdValidation(), validateRequest, deliveryController.arriveAtDestination);
router.post("/:id/complete", authorizeRoles("shipper"), deliveryIdValidation(), validateRequest, deliveryController.completeDelivery);
router.post("/:id/cancel", authorizeRoles("owner"), deliveryIdValidation(), validateRequest, deliveryController.cancelDelivery);
router.post("/:id/authorize", authorizeRoles("owner"), deliveryIdValidation(), validateRequest, deliveryController.authorizeDelivery);
router.post(
    "/:id/unlock",
    authorizeRoles("shipper"),
    unlockRateLimiter,
    deliveryIdValidation(),
    [
        body("code").isString().matches(/^\d{6}$/).withMessage("Unlock code must be exactly 6 digits."),
        body().custom((value) => {
            if (!value || typeof value !== "object" || Array.isArray(value)
                || Object.keys(value).some((field) => field !== "code")) {
                throw new Error("Only code can be provided.");
            }
            return true;
        }),
    ],
    validateRequest,
    deliveryController.unlockDelivery,
);
router.post(
    "/:id/report-problem",
    authorizeRoles("shipper"),
    deliveryIdValidation(),
    [
        body("category").isIn(["vehicle", "pickup", "delivery", "recipient", "safety", "other"]).withMessage("Choose a valid problem category."),
        body("description").isString().trim().isLength({ min: 5, max: 2000 }).withMessage("Description must be 5 to 2000 characters."),
        body().custom((value) => {
            if (!value || typeof value !== "object" || Array.isArray(value)
                || Object.keys(value).some((field) => !["category", "description"].includes(field))) {
                throw new Error("Only category and description can be provided.");
            }
            return true;
        }),
    ],
    validateRequest,
    deliveryController.reportDeliveryProblem,
);

export default router;