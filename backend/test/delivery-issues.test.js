import assert from "node:assert/strict";
import { test } from "node:test";
import { authorizeRoles } from "../src/middleware/authorize.middleware.js";
import AppError from "../src/utils/app-error.js";

process.env.JWT_SECRET = "lockship-test-secret-with-at-least-32-characters";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/lockship-test";

const { default: Delivery } = await import("../src/models/delivery.model.js");
const { default: DeliveryIssue } = await import("../src/models/delivery-issue.model.js");
const { default: Notification } = await import("../src/models/notification.model.js");
const deliveryService = await import("../src/services/delivery.service.js");

test("shipper report is scoped to assigned delivery and notifies its owner", async () => {
    const originalDeliveryFind = Delivery.findOne;
    const originalIssueCreate = DeliveryIssue.create;
    const originalNotificationCreate = Notification.create;
    const shipperId = "507f1f77bcf86cd799439012";
    const ownerId = "507f1f77bcf86cd799439011";
    const deliveryId = "507f1f77bcf86cd799439013";
    let deliveryFilter;
    let issueData;
    let notificationData;
    Delivery.findOne = async (filter) => {
        deliveryFilter = filter;
        return { _id: deliveryId, id: deliveryId, ownerId, shipperId, status: "in-progress" };
    };
    DeliveryIssue.create = async (data) => {
        issueData = data;
        return data;
    };
    Notification.create = async (data) => {
        notificationData = data;
        return data;
    };

    try {
        const issue = await deliveryService.reportDeliveryProblem(shipperId, deliveryId, {
            category: "vehicle",
            description: "A tire is losing pressure.",
        });
        assert.deepEqual(deliveryFilter, { _id: deliveryId, shipperId });
        assert.equal(issue.deliveryId, deliveryId);
        assert.equal(issueData.ownerId, ownerId);
        assert.equal(issueData.shipperId, shipperId);
        assert.equal(notificationData.userId, ownerId);
        assert.equal(notificationData.type, "delivery_problem_reported");
    } finally {
        Delivery.findOne = originalDeliveryFind;
        DeliveryIssue.create = originalIssueCreate;
        Notification.create = originalNotificationCreate;
    }
});

test("shipper report rejects delivery outside their assignment", async () => {
    const originalDeliveryFind = Delivery.findOne;
    Delivery.findOne = async () => null;

    try {
        await assert.rejects(
            deliveryService.reportDeliveryProblem("507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013", {
                category: "other",
                description: "This is a valid report.",
            }),
            (error) => error instanceof AppError && error.statusCode === 404,
        );
    } finally {
        Delivery.findOne = originalDeliveryFind;
    }
});

test("shippers cannot list another role's delivery reports", async () => {
    let error;
    authorizeRoles("owner")({ user: { role: "shipper" } }, {}, (nextError) => { error = nextError; });
    assert.equal(error instanceof AppError, true);
    assert.equal(error.statusCode, 403);
});

test("admin issue report listing is global", async () => {
    const originalFind = DeliveryIssue.find;
    let receivedFilter;
    DeliveryIssue.find = (filter) => ({
        sort(sortOrder) {
            receivedFilter = filter;
            assert.deepEqual(sortOrder, { createdAt: -1 });
            return [];
        },
    });

    try {
        assert.deepEqual(await deliveryService.listDeliveryIssues("admin", "507f1f77bcf86cd799439099"), []);
        assert.deepEqual(receivedFilter, {});
    } finally {
        DeliveryIssue.find = originalFind;
    }
});