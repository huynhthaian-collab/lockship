import { Router } from "express";
import { body, param } from "express-validator";
import * as userController from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/authorize.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";

const router = Router();
const userIdValidation = () => [param("userId").isMongoId().withMessage("A valid user ID is required.")];
const nameValidation = () => body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Name must be 2 to 100 characters.");
const emailValidation = () => body("email").trim().isEmail().withMessage("A valid email is required.").normalizeEmail();
const passwordValidation = () => body("password").isString().isLength({ min: 8, max: 128 }).withMessage("Password must be 8 to 128 characters.");

function optionalProfileValidation() {
    return [
        body("name").optional().isString().trim().isLength({ min: 2, max: 100 }).withMessage("Name must be 2 to 100 characters."),
        body("email").optional().isString().trim().isEmail().withMessage("A valid email is required.").normalizeEmail(),
        body("phone").optional({ nullable: true }).isString().trim().isLength({ max: 30 }).withMessage("Phone must be at most 30 characters."),
        body("address").optional().isString().trim().isLength({ min: 3, max: 500 }).withMessage("Address must be 3 to 500 characters."),
        body("avatar").optional({ nullable: true }).isString().trim().isLength({ max: 2048 }).withMessage("Avatar must be at most 2048 characters."),
        body().custom((value) => {
            const allowedFields = ["name", "email", "phone", "address", "avatar"];
            if (!value || typeof value !== "object" || Array.isArray(value)
                || !Object.keys(value).some((field) => allowedFields.includes(field))) {
                throw new Error("At least one profile field is required.");
            }
            if (Object.keys(value).some((field) => !allowedFields.includes(field))) {
                throw new Error("Only name, email, phone, address, and avatar can be updated.");
            }
            return true;
        }),
    ];
}

router.use(authenticate);

router.get("/shippers", authorizeRoles("owner"), userController.listOwnerShippers);
router.post(
    "/shippers",
    authorizeRoles("owner"),
    [
        nameValidation(),
        emailValidation(),
        passwordValidation(),
        body("address").trim().isLength({ min: 3, max: 500 }).withMessage("Address must be 3 to 500 characters."),
        body("phone").optional({ nullable: true }).trim().isLength({ max: 30 }).withMessage("Phone must be at most 30 characters."),
        body("avatar").optional({ nullable: true }).trim().isLength({ max: 2048 }).withMessage("Avatar must be at most 2048 characters."),
        body().custom((value) => {
            const allowedFields = ["name", "email", "password", "address", "phone", "avatar"];
            if (!value || typeof value !== "object" || Array.isArray(value)
                || Object.keys(value).some((field) => !allowedFields.includes(field))) {
                throw new Error("Only name, email, password, role, ownerId, phone, address, and avatar can be provided.");
            }
            return true;
        }),
    ],
    validateRequest,
    userController.createOwnerShipper,
);
router.get("/shippers/:userId", authorizeRoles("owner"), userIdValidation(), validateRequest, userController.getOwnerShipper);
router.put("/shippers/:userId", authorizeRoles("owner"), userIdValidation(), optionalProfileValidation(), validateRequest, userController.updateOwnerShipper);
router.delete("/shippers/:userId", authorizeRoles("owner"), userIdValidation(), validateRequest, userController.removeOwnerShipper);

router.get("/", authorizeRoles("admin"), userController.listUsers);
router.post(
    "/",
    authorizeRoles("admin"),
    [
        nameValidation(),
        emailValidation(),
        passwordValidation(),
        body("role").isIn(["owner", "shipper", "admin"]).withMessage("A valid role is required."),
        body("ownerId").optional({ nullable: true }).isMongoId().withMessage("Owner ID must be a valid MongoDB ObjectId."),
        body("phone").optional({ nullable: true }).trim().isLength({ max: 30 }).withMessage("Phone must be at most 30 characters."),
        body("address").trim().isLength({ min: 3, max: 500 }).withMessage("Address must be 3 to 500 characters."),
        body("avatar").optional({ nullable: true }).trim().isLength({ max: 2048 }).withMessage("Avatar must be at most 2048 characters."),
        body().custom((value) => {
            const allowedFields = ["name", "email", "password", "role", "ownerId", "phone", "address", "avatar"];
            if (!value || typeof value !== "object" || Array.isArray(value)
                || Object.keys(value).some((field) => !allowedFields.includes(field))) {
                throw new Error("User contains unsupported fields.");
            }
            return true;
        }),
    ],
    validateRequest,
    userController.createUser,
);
router.get("/:userId", authorizeRoles("admin"), userIdValidation(), validateRequest, userController.getUser);
router.put("/:userId", authorizeRoles("admin"), userIdValidation(), optionalProfileValidation(), validateRequest, userController.updateUser);
router.delete("/:userId", authorizeRoles("admin"), userIdValidation(), validateRequest, userController.deleteUser);
router.patch(
    "/:userId/status",
    authorizeRoles("admin"),
    userIdValidation(),
    [body("status").isIn(["active", "inactive", "suspended"]).withMessage("A valid user status is required.")],
    validateRequest,
    userController.updateUserStatus,
);
router.patch(
    "/:userId/role",
    authorizeRoles("admin"),
    userIdValidation(),
    [
        body("role").isIn(["owner", "shipper", "admin"]).withMessage("A valid role is required."),
        body("ownerId").optional({ nullable: true }).isMongoId().withMessage("Owner ID must be a valid MongoDB ObjectId."),
        body().custom((value) => {
            const allowedFields = ["role", "ownerId"];
            if (!value || typeof value !== "object" || Array.isArray(value)
                || Object.keys(value).some((field) => !allowedFields.includes(field))) {
                throw new Error("Only role and ownerId can be updated.");
            }
            return true;
        }),
    ],
    validateRequest,
    userController.updateUserRole,
);

export default router;