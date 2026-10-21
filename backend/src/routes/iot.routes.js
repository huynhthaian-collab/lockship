import { Router } from "express";
import { body, param } from "express-validator";
import * as iotController from "../controllers/iot.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/authorize.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";

const router = Router();
const deviceIdValidation = () => param("id").isMongoId().withMessage("A valid IoT device ID is required.");

router.use(authenticate);
router.get("/", authorizeRoles("owner", "admin"), iotController.listDevices);
router.post(
    "/",
    authorizeRoles("owner", "admin"),
    [
        body("deviceId").isString().trim().matches(/^[A-Za-z0-9_-]{3,100}$/).withMessage("deviceId must be 3 to 100 letters, numbers, underscores, or hyphens."),
        body("vehicleId").isMongoId().withMessage("A valid vehicleId is required."),
        body("ownerId")
            .if((_value, { req }) => req.user.role === "admin")
            .isMongoId()
            .withMessage("Admins must provide a valid ownerId."),
        body().custom((value, { req }) => {
            const allowedFields = req.user.role === "admin" ? ["deviceId", "vehicleId", "ownerId"] : ["deviceId", "vehicleId"];
            if (!value || typeof value !== "object" || Array.isArray(value)
                || Object.keys(value).some((field) => !allowedFields.includes(field))) {
                throw new Error("The device request contains unsupported fields.");
            }
            return true;
        }),
    ],
    validateRequest,
    iotController.createDevice,
);
router.get("/:id/status", authorizeRoles("owner", "admin"), deviceIdValidation(), validateRequest, iotController.getDeviceStatus);
router.get("/:id/logs", authorizeRoles("owner", "admin"), deviceIdValidation(), validateRequest, iotController.getDeviceLogs);
router.post(
    "/:id/command",
    authorizeRoles("owner", "admin"),
    deviceIdValidation(),
    [
        body("command").isIn(["LOCK", "UNLOCK", "STATUS", "PING"]).withMessage("Command must be LOCK, UNLOCK, STATUS, or PING."),
        body().custom((value) => {
            if (!value || typeof value !== "object" || Array.isArray(value)
                || Object.keys(value).some((field) => field !== "command")) {
                throw new Error("Only command can be provided.");
            }
            return true;
        }),
    ],
    validateRequest,
    iotController.publishCommand,
);
router.get("/:id", authorizeRoles("owner", "admin"), deviceIdValidation(), validateRequest, iotController.getDevice);
router.put(
    "/:id",
    authorizeRoles("owner", "admin"),
    deviceIdValidation(),
    [
        body("vehicleId").isMongoId().withMessage("A valid vehicleId is required."),
        body().custom((value) => {
            if (!value || typeof value !== "object" || Array.isArray(value)
                || Object.keys(value).some((field) => field !== "vehicleId")) {
                throw new Error("Only vehicleId can be changed.");
            }
            return true;
        }),
    ],
    validateRequest,
    iotController.updateDevice,
);
router.delete("/:id", authorizeRoles("owner", "admin"), deviceIdValidation(), validateRequest, iotController.deleteDevice);

export default router;