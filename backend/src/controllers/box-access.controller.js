import * as boxAccessService from "../services/box-access.service.js";

export async function getBoxInfo(req, res, next) {
    try {
        const { boxId } = req.params;
        const box = await boxAccessService.getPublicBoxInfo(boxId);
        res.status(200).json({
            success: true,
            data: { box },
        });
    } catch (error) {
        next(error);
    }
}

export async function requestAccess(req, res, next) {
    try {
        const { boxId } = req.params;
        const { shipperName, shipperPhone, deliverySource, packageDescription } = req.body;
        const result = await boxAccessService.createPublicAccessRequest({
            boxId,
            shipperName,
            shipperPhone,
            deliverySource,
            packageDescription,
        });

        res.status(201).json({
            success: true,
            message: "Yêu cầu mở tủ đã được gửi tới Chủ tủ thành công.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function getRequestStatus(req, res, next) {
    try {
        const { boxId, requestId } = req.params;
        const status = await boxAccessService.getPublicRequestStatus(boxId, requestId);
        res.status(200).json({
            success: true,
            data: { request: status },
        });
    } catch (error) {
        next(error);
    }
}

export async function listOwnerRequests(req, res, next) {
    try {
        const ownerId = req.user.id;
        const { status } = req.query;
        const data = await boxAccessService.listOwnerAccessRequests(ownerId, { status });
        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        next(error);
    }
}

export async function respondOwnerRequest(req, res, next) {
    try {
        const ownerId = req.user.id;
        const { requestId } = req.params;
        const { action, orderId, notes } = req.body;
        const result = await boxAccessService.respondAccessRequest(ownerId, requestId, {
            action,
            orderId,
            notes,
        });

        res.status(200).json({
            success: true,
            message: action === "APPROVE" ? "Đã phê duyệt yêu cầu mở tủ và gửi mã PIN tới shipper." : "Đã từ chối yêu cầu mở tủ.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}
