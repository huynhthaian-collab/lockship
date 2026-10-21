import { Router } from "express";
import { body, param } from "express-validator";
import * as vehicleController from "../controllers/vehicle.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/authorize.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";

const router = Router();
const editableFields = ["plateNumber", "type", "model", "iotDeviceId", "status"];

function validateVehicleBody({ isCreate }) {
    const fields = [
        body("plateNumber")
        [isCreate ? "exists" : "optional"]()
            .trim()
            .isLength({ min: 2, max: 20 })
            .matches(/^[A-Za-z0-9][A-Za-z0-9 -]*$/)
            .withMessage("Plate number must be 2 to 20 letters, numbers, spaces, or hyphens.")
            .customSanitizer((value) => value.replace(/\s+/g, " ").toUpperCase()),
        body("type")
        [isCreate ? "exists" : "optional"]()
            .isString()
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage("Vehicle type must be 1 to 50 characters."),
        body("model")
        [isCreate ? "exists" : "optional"]()
            .isString()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage("Vehicle model must be 1 to 100 characters."),
        body("iotDeviceId")
            .optional({ nullable: true })
            .isString()
            .trim()
            .isLength({ max: 100 })
            .withMessage("IoT device ID must be at most 100 characters."),
        body("status")
            .optional()
            .isIn(["active", "inactive"])
            .withMessage("Vehicle status must be active or inactive."),
    ];

    if (!isCreate) {
        fields.push(
            body("ownerId")
                .if((_value, { req }) => req.user.role === "admin")
                .optional()
                .isMongoId()
                .withMessage("Owner ID must be a valid MongoDB ObjectId."),
        );
    }

    fields.push(
        body().custom((value, { req }) => {
            const allowedFields = req.user.role === "admin" && !isCreate
                ? [...editableFields, "ownerId"]
                : editableFields;

            if (!value || typeof value !== "object" || Array.isArray(value)) {
                throw new Error("A JSON object is required.");
            }
            if (isCreate && !["plateNumber", "type", "model"].every((field) => Object.hasOwn(value, field))) {
                throw new Error("Plate number, type, and model are required.");
            }
            if (!isCreate && !Object.keys(value).some((field) => allowedFields.includes(field))) {
                throw new Error("At least one editable vehicle field is required.");
            }
            if (Object.keys(value).some((field) => !allowedFields.includes(field))) {
                throw new Error("The request contains fields that cannot be changed.");
            }
            return true;
        }),
    );

    return fields;
}

router.use(authenticate);
router.get("/", authorizeRoles("owner", "admin"), vehicleController.listVehicles);
router.post(
    "/",
    authorizeRoles("owner"),
    validateVehicleBody({ isCreate: true }),
    validateRequest,
    vehicleController.createVehicle,
);
router.get(
    "/:id",
    authorizeRoles("owner", "admin"),
    param("id").isMongoId().withMessage("A valid vehicle ID is required."),
    validateRequest,
    vehicleController.getVehicle,
);
router.put(
    "/:id",
    authorizeRoles("owner", "admin"),
    param("id").isMongoId().withMessage("A valid vehicle ID is required."),
    validateVehicleBody({ isCreate: false }),
    validateRequest,
    vehicleController.updateVehicle,
);
router.delete(
    "/:id",
    authorizeRoles("owner", "admin"),
    param("id").isMongoId().withMessage("A valid vehicle ID is required."),
    validateRequest,
    vehicleController.removeVehicle,
);

export default router;