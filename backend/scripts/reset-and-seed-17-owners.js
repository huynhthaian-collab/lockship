import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/user.model.js";
import Box from "../src/models/box.model.js";
import MonthlyInvoice from "../src/models/monthly-invoice.model.js";
import Feedback from "../src/models/feedback.model.js";
import BoxAccessRequest from "../src/models/box-access-request.model.js";
import Delivery from "../src/models/delivery.model.js";
import IoTDevice from "../src/models/iot-device.model.js";
import IoTEvent from "../src/models/iot-event.model.js";
import Notification from "../src/models/notification.model.js";

const uri =
    process.env.MONGODB_URI ||
    "mongodb+srv://huynhthaian18112004_db_user:f8MFNOdLw4DZzcan@cluster0.qagzliz.mongodb.net/lockship?retryWrites=true&w=majority&appName=Cluster0";

function buildQrMetadata(boxId) {
    const baseHost = "https://lockship-gamma.vercel.app";
    const qrUrl = `${baseHost}/public/box-scan/${boxId}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrUrl)}`;
    return { qrUrl, qrImageUrl };
}

function generateTransferSyntax(ownerName) {
    const cleanName = (ownerName || "OWNER")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9\s]/g, "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();
    return `LOCKSHIP ${cleanName} T10`;
}

export const SEED_17_OWNERS = [
    {
        stt: 1,
        name: "Lê Hoàng Khang",
        email: "khang.lh@lockship.vn",
        phone: "0901234001",
        boxCode: "BOX-01",
        boxName: "Lockship Box #01 (Bến Ninh Kiều)",
        address: "Số 2 Đường Hai Bà Trưng, P. Tân An, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0342, lng: 105.7831 },
        usagesCount: 3,
        dates: [
            { day: "05", time: "11:20", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1011" },
            { day: "14", time: "09:45", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-1012" },
            { day: "24", time: "16:30", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1013" },
        ],
        feedback: {
            rating: 5,
            comment: "Tủ khóa Lockship tại Bến Ninh Kiều rất an toàn và tiện lợi. Shipper giao hàng vào tủ rất nhanh, cước 5.000đ/lượt quá hợp lý.",
            date: "2026-10-25T17:00:00.000Z",
        },
    },
    {
        stt: 2,
        name: "Nguyễn Thành Vinh",
        email: "vinh.nt@lockship.vn",
        phone: "0901234002",
        boxCode: "BOX-02",
        boxName: "Lockship Box #02 (ĐH Cần Thơ)",
        address: "Khu II, Đường 3/2, P. Xuân Khánh, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0299, lng: 105.7706 },
        usagesCount: 5,
        dates: [
            { day: "03", time: "09:15", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-2021" },
            { day: "08", time: "14:30", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-2022" },
            { day: "15", time: "18:40", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-2023" },
            { day: "21", time: "10:20", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-2024" },
            { day: "27", time: "16:05", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-2025" },
        ],
        feedback: {
            rating: 5,
            comment: "Đặt ngay trước cổng trường ĐH Cần Thơ, sinh viên và giảng viên nhận hàng không lo thất lạc. Thanh toán QR BIDV chỉ 3 giây.",
            date: "2026-10-28T16:30:00.000Z",
        },
    },
    {
        stt: 3,
        name: "Lê Thị Kim Ngân",
        email: "ngan.ltk@lockship.vn",
        phone: "0901234003",
        boxCode: "BOX-03",
        boxName: "Lockship Box #03 (Vincom Hùng Vương)",
        address: "Số 2 Đường Hùng Vương, P. Thới Bình, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0415, lng: 105.7812 },
        usagesCount: 3,
        dates: [
            { day: "04", time: "10:15", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-3031" },
            { day: "13", time: "15:20", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-3032" },
            { day: "22", time: "17:40", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-3033" },
        ],
        feedback: {
            rating: 5,
            comment: "Khóa tủ phản hồi nhanh tức thì, shipper Shopee và Lazada đều khen thao tác quét QR rất mượt mà.",
            date: "2026-10-24T18:00:00.000Z",
        },
    },
    {
        stt: 4,
        name: "Trần Ngọc Quế Anh",
        email: "anh.tnq@lockship.vn",
        phone: "0901234004",
        boxCode: "BOX-04",
        boxName: "Lockship Box #04 (Mậu Thân)",
        address: "Số 122 Mậu Thân, P. An Phú, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0378, lng: 105.7745 },
        usagesCount: 3,
        dates: [
            { day: "06", time: "08:50", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-4041" },
            { day: "16", time: "14:10", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-4042" },
            { day: "25", time: "11:35", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-4043" },
        ],
        feedback: {
            rating: 5,
            comment: "Không còn lo đi vắng shipper không giao được hàng. Nhận thông báo kèm ảnh chụp kiện hàng cực kỳ yên tâm.",
            date: "2026-10-26T12:00:00.000Z",
        },
    },
    {
        stt: 5,
        name: "Nguyễn Đình Khôi",
        email: "khoi.nd@lockship.vn",
        phone: "0901234005",
        boxCode: "BOX-05",
        boxName: "Lockship Box #05 (Nguyễn Văn Cừ)",
        address: "Số 108 Nguyễn Văn Cừ, P. An Hòa, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0451, lng: 105.7623 },
        usagesCount: 4,
        dates: [
            { day: "04", time: "08:30", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-5051" },
            { day: "11", time: "12:15", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-5052" },
            { day: "18", time: "17:50", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-5053" },
            { day: "26", time: "15:10", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-5054" },
        ],
        feedback: {
            rating: 5,
            comment: "Tủ hoạt động bền bỉ, tính năng mở khẩn cấp và mã OTP dự phòng hoạt động rất tin cậy khi cúp điện.",
            date: "2026-10-27T15:30:00.000Z",
        },
    },
    {
        stt: 6,
        name: "Trần Tiến Việt",
        email: "viet.tt@lockship.vn",
        phone: "0901234006",
        boxCode: "BOX-06",
        boxName: "Lockship Box #06 (Trần Hưng Đạo)",
        address: "Số 45 Trần Hưng Đạo, P. An Nghiệp, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0336, lng: 105.7785 },
        usagesCount: 4,
        dates: [
            { day: "05", time: "09:20", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-6061" },
            { day: "12", time: "16:45", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-6062" },
            { day: "19", time: "10:30", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-6063" },
            { day: "27", time: "18:15", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-6064" },
        ],
        feedback: {
            rating: 5,
            comment: "Trải nghiệm dịch vụ tuyệt vời. Hóa đơn cuối tháng thanh toán qua VietQR BIDV chỉ mất 3 giây quét mã.",
            date: "2026-10-28T18:45:00.000Z",
        },
    },
    {
        stt: 7,
        name: "Trần Đông Đông",
        email: "dong.td@lockship.vn",
        phone: "0901234007",
        boxCode: "BOX-07",
        boxName: "Lockship Box #07 (Đường 30/4)",
        address: "Số 88 Đường 30/4, P. An Phú, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0275, lng: 105.7758 },
        usagesCount: 2,
        dates: [
            { day: "09", time: "14:00", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-7071" },
            { day: "23", time: "11:20", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-7072" },
        ],
        feedback: {
            rating: 4,
            comment: "Dùng thử tháng đầu thấy rất tiện, 5k/lượt cho kiện hàng an toàn là chi phí rất hợp túi tiền.",
            date: "2026-10-24T11:45:00.000Z",
        },
    },
    {
        stt: 8,
        name: "Diệp Phát",
        email: "phat.diep@lockship.vn",
        phone: "0901234008",
        boxCode: "BOX-08",
        boxName: "Lockship Box #08 (Lý Tự Trọng)",
        address: "Số 73 Lý Tự Trọng, P. An Cư, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0358, lng: 105.7820 },
        usagesCount: 2,
        dates: [
            { day: "10", time: "10:15", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-8081" },
            { day: "24", time: "15:40", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-8082" },
        ],
        feedback: {
            rating: 5,
            comment: "Hệ thống thông báo đẩy real-time rất nhạy, có cả chuông báo khi shipper mở hộc tủ.",
            date: "2026-10-25T16:00:00.000Z",
        },
    },
    {
        stt: 9,
        name: "Bùi Ngọc Yến Linh",
        email: "linh.bny@lockship.vn",
        phone: "0901234009",
        boxCode: "BOX-09",
        boxName: "Lockship Box #09 (Chợ Cái Khế)",
        address: "Khu Thương Mại Cái Khế, P. Cái Khế, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0512, lng: 105.7865 },
        usagesCount: 4,
        dates: [
            { day: "03", time: "11:00", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-9091" },
            { day: "11", time: "16:30", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-9092" },
            { day: "18", time: "09:15", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-9093" },
            { day: "28", time: "17:00", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-9094" },
        ],
        feedback: {
            rating: 5,
            comment: "Khu vực chợ Cái Khế đông đúc nhưng tủ Lockship được thiết kế chắc chắn, chống cạy phá tuyệt vời.",
            date: "2026-10-29T10:00:00.000Z",
        },
    },
    {
        stt: 10,
        name: "Nguyễn Hữu Thành",
        email: "thanh.nh@lockship.vn",
        phone: "0901234010",
        boxCode: "BOX-10",
        boxName: "Lockship Box #10 (Khu Dân Cư Metro)",
        address: "Đường số 1, KDC Metro, P. Hưng Lợi, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0195, lng: 105.7642 },
        usagesCount: 2,
        dates: [
            { day: "08", time: "10:30", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1001" },
            { day: "22", time: "14:45", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-1002" },
        ],
        feedback: {
            rating: 4,
            comment: "Rất tiện lợi khi tôi bận họp không ra lấy đồ được. Tủ khóa thông minh hoạt động rất ổn định.",
            date: "2026-10-23T15:00:00.000Z",
        },
    },
    {
        stt: 11,
        name: "Lê Châu Bảo Ngân",
        email: "ngan.lcb@lockship.vn",
        phone: "0901234011",
        boxCode: "BOX-11",
        boxName: "Lockship Box #11 (Nguyễn Thị Minh Khai)",
        address: "Số 35 Nguyễn Thị Minh Khai, P. An Lạc, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0315, lng: 105.7845 },
        usagesCount: 5,
        dates: [
            { day: "02", time: "09:40", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1101" },
            { day: "07", time: "15:10", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-1102" },
            { day: "14", time: "11:25", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1103" },
            { day: "20", time: "17:30", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-1104" },
            { day: "26", time: "14:00", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1105" },
        ],
        feedback: {
            rating: 5,
            comment: "Tôi mua hàng online thường xuyên, có tủ Lockship này không bao giờ lo giao hàng lỡ hẹn.",
            date: "2026-10-27T14:30:00.000Z",
        },
    },
    {
        stt: 12,
        name: "Bùi Tú Anh",
        email: "anh.bt@lockship.vn",
        phone: "0901234012",
        boxCode: "BOX-12",
        boxName: "Lockship Box #12 (Nguyễn Trãi)",
        address: "Số 50 Nguyễn Trãi, P. An Hội, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0385, lng: 105.7830 },
        usagesCount: 3,
        dates: [
            { day: "05", time: "08:45", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1201" },
            { day: "15", time: "16:15", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-1202" },
            { day: "25", time: "10:50", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1203" },
        ],
        feedback: {
            rating: 5,
            comment: "Giao diện web trực quan, bàn phím số to rõ ràng. Shipper nào quét mã QR cũng khen dễ dùng.",
            date: "2026-10-26T11:00:00.000Z",
        },
    },
    {
        stt: 13,
        name: "Nguyễn Hữu Nghĩa",
        email: "nghia.nh@lockship.vn",
        phone: "0901234013",
        boxCode: "BOX-13",
        boxName: "Lockship Box #13 (Nam Kỳ Khởi Nghĩa)",
        address: "Số 18 Nam Kỳ Khởi Nghĩa, P. Tân An, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0328, lng: 105.7860 },
        usagesCount: 4,
        dates: [
            { day: "04", time: "10:00", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1301" },
            { day: "11", time: "14:20", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-1302" },
            { day: "19", time: "09:30", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1303" },
            { day: "27", time: "16:40", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-1304" },
        ],
        feedback: {
            rating: 5,
            comment: "Hệ thống quản lý rất chỉn chu. Báo cáo cước tháng minh bạch từng lượt dùng, kiểm tra rất rõ ràng.",
            date: "2026-10-28T17:15:00.000Z",
        },
    },
    {
        stt: 14,
        name: "Huỳnh Thúy Duy",
        email: "duy.ht@lockship.vn",
        phone: "0901234014",
        boxCode: "BOX-14",
        boxName: "Lockship Box #14 (Võ Văn Kiệt)",
        address: "Số 15 Võ Văn Kiệt, P. An Hòa, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0520, lng: 105.7580 },
        usagesCount: 5,
        dates: [
            { day: "03", time: "08:15", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1401" },
            { day: "09", time: "13:40", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-1402" },
            { day: "16", time: "17:10", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1403" },
            { day: "22", time: "11:05", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-1404" },
            { day: "29", time: "15:50", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1405" },
        ],
        feedback: {
            rating: 5,
            comment: "Rất an tâm về chất lượng phần cứng và độ bảo mật của tủ khóa Lockship. Sẽ tiếp tục dùng lâu dài.",
            date: "2026-10-30T16:00:00.000Z",
        },
    },
    {
        stt: 15,
        name: "Nguyễn Ngọc Thiện",
        email: "thien.nn@lockship.vn",
        phone: "0901234015",
        boxCode: "BOX-15",
        boxName: "Lockship Box #15 (Phạm Ngũ Lão)",
        address: "Số 28 Phạm Ngũ Lão, P. An Hòa, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0465, lng: 105.7710 },
        usagesCount: 5,
        dates: [
            { day: "04", time: "09:30", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1501" },
            { day: "10", time: "14:15", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-1502" },
            { day: "17", time: "10:45", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1503" },
            { day: "23", time: "16:20", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-1504" },
            { day: "28", time: "11:30", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1505" },
        ],
        feedback: {
            rating: 5,
            comment: "Thao tác xác thực mở tủ cho shipper ngay trên điện thoại cực kỳ tiện lợi. Đánh giá 5 sao!",
            date: "2026-10-29T12:00:00.000Z",
        },
    },
    {
        stt: 16,
        name: "Nguyễn Hữu Tấn",
        email: "tan.nh@lockship.vn",
        phone: "0901234016",
        boxCode: "BOX-16",
        boxName: "Lockship Box #16 (Cách Mạng Tháng 8)",
        address: "Số 64 Cách Mạng Tháng 8, P. Cái Khế, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0480, lng: 105.7790 },
        usagesCount: 4,
        dates: [
            { day: "06", time: "10:20", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1601" },
            { day: "13", time: "15:00", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-1602" },
            { day: "20", time: "09:40", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1603" },
            { day: "27", time: "17:15", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-1604" },
        ],
        feedback: {
            rating: 5,
            comment: "Nhận hàng ngoài giờ hành chính hoàn toàn chủ động, dịch vụ chất lượng chuẩn 5 sao!",
            date: "2026-10-28T18:00:00.000Z",
        },
    },
    {
        stt: 17,
        name: "Võ Thị Thu Hà",
        email: "ha.vtt@lockship.vn",
        phone: "0901234017",
        boxCode: "BOX-17",
        boxName: "Lockship Box #17 (Nguyễn Văn Linh)",
        address: "Số 120 Nguyễn Văn Linh, P. Hưng Lợi, Q. Ninh Kiều, Cần Thơ",
        location: { lat: 10.0210, lng: 105.7680 },
        usagesCount: 6,
        dates: [
            { day: "02", time: "08:30", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1701" },
            { day: "07", time: "12:15", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-1702" },
            { day: "13", time: "17:45", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1703" },
            { day: "18", time: "11:20", action: "OTP_PICKUP_SUCCESS", ord: "ORD-202610-1704" },
            { day: "24", time: "16:10", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1705" },
            { day: "30", time: "14:35", action: "DELIVERED_TO_LOCKER", ord: "ORD-202610-1706" },
        ],
        feedback: {
            rating: 5,
            comment: "Tôi là tín đồ mua sắm online, tháng 10 nhận tới 6 kiện hàng qua tủ Lockship. Cực kỳ ưng ý và an tâm!",
            date: "2026-10-31T15:00:00.000Z",
        },
    },
]

export const WAREHOUSE_BOXES = [
    {
        boxId: "BOX-18",
        code: "BOX-18",
        name: "Lockship Box #18 (Trạm Ninh Kiều Dự Phòng)",
        address: "Kho trung tâm Ninh Kiều, Cần Thơ",
        location: { lat: 10.035, lng: 105.78 },
        totalCompartments: 12,
        registrationStatus: "UNASSIGNED",
        status: "AVAILABLE",
        ownerId: null,
    },
    {
        boxId: "BOX-19",
        code: "BOX-19",
        name: "Lockship Box #19 (Trạm Cái Răng Dự Phòng)",
        address: "Kho trung tâm Cái Răng, Cần Thơ",
        location: { lat: 10.015, lng: 105.75 },
        totalCompartments: 12,
        registrationStatus: "UNASSIGNED",
        status: "AVAILABLE",
        ownerId: null,
    },
    {
        boxId: "BOX-20",
        code: "BOX-20",
        name: "Lockship Box #20 (Trạm Bình Thủy Dự Phòng)",
        address: "Kho trung tâm Bình Thủy, Cần Thơ",
        location: { lat: 10.065, lng: 105.73 },
        totalCompartments: 12,
        registrationStatus: "UNASSIGNED",
        status: "AVAILABLE",
        ownerId: null,
    },
]

async function runResetAndSeed() {
    console.log("=========================================================");
    console.log("   LOCKSHIP: RESET DATABASE & SEED 17 OWNERS (100% PAID)");
    console.log("=========================================================");

    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
        console.log(" Connected to MongoDB Atlas successfully.");

        // 1. CLEANUP USERS: Keep only 1 Admin (admin@lockship.vn / admin123)
        console.log("\n--- [PHẦN 1] DỌN DẸP DỮ LIỆU & RESET DATABASE ---");
        
        let adminUser = await User.findOne({ email: "admin@lockship.vn" });
        const adminHashedPassword = bcrypt.hashSync("admin123", 10);
        
        if (adminUser) {
            adminUser.name = "Quản Trị Viên Hệ Thống";
            adminUser.role = "admin";
            adminUser.status = "active";
            adminUser.phone = "0909000000";
            adminUser.address = "Trụ sở Điều hành Lockship, Cần Thơ";
            adminUser.password = adminHashedPassword;
            await adminUser.save();
            console.log(` Kept & updated Admin: ${adminUser.email} (ID: ${adminUser._id})`);
        } else {
            adminUser = await User.create({
                name: "Quản Trị Viên Hệ Thống",
                email: "admin@lockship.vn",
                password: adminHashedPassword,
                role: "admin",
                status: "active",
                phone: "0909000000",
                address: "Trụ sở Điều hành Lockship, Cần Thơ",
            });
            console.log(` Created new Admin: ${adminUser.email} (ID: ${adminUser._id})`);
        }

        // Delete all non-admin users
        const deleteUsersRes = await User.deleteMany({ _id: { $ne: adminUser._id } });
        console.log(` Deleted ${deleteUsersRes.deletedCount} old non-admin user accounts.`);

        // Clear orphan data
        const delInvoices = await MonthlyInvoice.deleteMany({});
        const delAccess = await BoxAccessRequest.deleteMany({});
        const delDeliveries = await Delivery.deleteMany({});
        const delFeedbacks = await Feedback.deleteMany({});
        const delBoxes = await Box.deleteMany({});
        const delNotifications = await Notification.deleteMany({});
        const delEvents = await IoTEvent.deleteMany({});
        const delDevices = await IoTDevice.deleteMany({});

        console.log(` Cleared:
          - ${delInvoices.deletedCount} invoices
          - ${delAccess.deletedCount} box access requests
          - ${delDeliveries.deletedCount} deliveries
          - ${delFeedbacks.deletedCount} feedbacks
          - ${delBoxes.deletedCount} boxes
          - ${delNotifications.deletedCount} notifications
          - ${delEvents.deletedCount} IoT events
          - ${delDevices.deletedCount} IoT devices`);

        // 2. SEED 17 OWNERS, BOXES, INVOICES, AND FEEDBACKS
        console.log("\n--- [PHẦN 2] SEED 17 OWNERS, BOXES & HÓA ĐƠN THÁNG 10 (100% PAID) ---");

        const ownerDefaultPassword = bcrypt.hashSync("123456", 10);
        let totalSystemUsages = 0;
        let totalSystemRevenue = 0;

        for (const data of SEED_17_OWNERS) {
            // A. Create User (Owner)
            const owner = await User.create({
                name: data.name,
                email: data.email,
                phone: data.phone,
                address: data.address,
                role: "owner",
                status: "active",
                password: ownerDefaultPassword,
            });

            // B. Create Box
            const qr = buildQrMetadata(data.boxCode);
            const box = await Box.create({
                boxId: data.boxCode,
                code: data.boxCode,
                name: data.boxName,
                ownerId: owner._id,
                registrationStatus: "ACTIVE",
                requestedAddress: data.address,
                requestedNote: "Đã nghiệm thu và kích hoạt thành công",
                requestedAt: new Date("2026-09-30T08:00:00.000Z"),
                address: data.address,
                location: data.location,
                status: "AVAILABLE",
                lockStatus: "locked",
                pinCode: "123456",
                qrUrl: qr.qrUrl,
                qrImageUrl: qr.qrImageUrl,
                batteryLevel: 95,
                lockHealthStatus: "HEALTHY",
                otpServiceStatus: "ONLINE",
                masterBackupPin: "888999",
                totalCompartments: 12,
            });

            // Link box in IoT devices if needed
            // (Boxes are tracked in Box model; IoTDevice is for vehicles)

            // C. Create Monthly Invoice for October 2026 (PAID 100%)
            const transferSyntax = generateTransferSyntax(data.name);
            const totalAmount = data.usagesCount * 5000;
            totalSystemUsages += data.usagesCount;
            totalSystemRevenue += totalAmount;

            const usageHistory = data.dates.map((d, idx) => ({
                boxId: data.boxCode,
                boxName: data.boxName,
                boxAddress: data.address,
                actionType: d.action || "DELIVERED_TO_LOCKER",
                orderReference: d.ord || `ORD-202610-${data.stt}${idx + 1}`,
                cost: 5000,
                usedAt: new Date(`2026-10-${d.day}T${d.time}:00.000Z`),
            }));

            await MonthlyInvoice.create({
                ownerId: owner._id,
                month: "2026-10",
                totalUsages: data.usagesCount,
                unitPrice: 5000,
                totalAmount,
                usageHistory,
                paymentStatus: "PAID",
                paymentMethod: "VIETQR_BIDV",
                paymentDate: new Date("2026-10-31T17:00:00.000Z"),
                paidAt: new Date("2026-10-31T17:00:00.000Z"),
                transferSyntax,
                paymentProofNote: "Thanh toán thành công 100% qua VietQR BIDV - PGD Thanh Bình (TRAN THI THUY QUYEN)",
                verifiedBy: adminUser._id,
                verifiedAt: new Date("2026-10-31T17:30:00.000Z"),
            });

            // D. Create Feedback
            await Feedback.create({
                userId: owner._id,
                ownerId: owner._id,
                boxId: data.boxCode,
                userName: data.name,
                userRole: "owner",
                rating: data.feedback?.rating || 5,
                comment: data.feedback?.comment || "Tủ khóa Lockship bảo mật cao, nhận hàng tiện lợi.",
                tags: ["Tủ khóa an toàn", "Mở khóa siêu nhanh", "Cước phí hợp lý", "Bảo mật cao"],
                isVisible: true,
                isPinned: data.stt <= 3,
                adminReply: "Cảm ơn Quý Chủ tủ đã đồng hành và tin tưởng hệ thống Lockship!",
                repliedAt: new Date("2026-10-31T18:00:00.000Z"),
                adminReplyBy: adminUser._id,
                createdAt: new Date(data.feedback?.date || "2026-10-28T10:00:00.000Z"),
            });

            console.log(`[${data.stt}/17] ${data.name} (${data.email}) -> ${data.boxCode} | ${data.usagesCount} lượt (${totalAmount.toLocaleString("vi-VN")} đ) | PAID 100%`);
        }

        // 3. SEED 3 WAREHOUSE BOXES
        console.log("\n--- [PHẦN 3] SEED 3 TỦ TRỐNG TRONG KHO (UNASSIGNED) ---");
        for (const wb of WAREHOUSE_BOXES) {
            const qr = buildQrMetadata(wb.boxId);
            await Box.create({
                ...wb,
                pinCode: "123456",
                qrUrl: qr.qrUrl,
                qrImageUrl: qr.qrImageUrl,
                batteryLevel: 98,
                lockHealthStatus: "HEALTHY",
                otpServiceStatus: "ONLINE",
                masterBackupPin: "888999",
            });
            console.log(` Created Warehouse Box: ${wb.boxId} (${wb.name}) - Status: UNASSIGNED`);
        }

        console.log("\n=========================================================");
        console.log("   TỔNG KẾT DỮ LIỆU ĐÃ SEED THÀNH CÔNG");
        console.log("=========================================================");
        console.log(`- Tài khoản Admin: 1 (admin@lockship.vn / admin123)`);
        console.log(`- Tài khoản Owner: 17 (mật khẩu mặc định: 123456)`);
        console.log(`- Tổng số Box: 20 (17 Box ACTIVE đã gán chủ + 3 Box UNASSIGNED trong kho)`);
        console.log(`- Tổng lượt sử dụng tháng 10: ${totalSystemUsages} lượt`);
        console.log(`- Tổng doanh thu tháng 10: ${totalSystemRevenue.toLocaleString("vi-VN")} VNĐ`);
        console.log(`- Tỷ lệ thu cước: 100% Hoàn tất (17/17 hóa đơn PAID qua VietQR BIDV)`);
        console.log(`- Tổng Feedback đã nạp: 17 đánh giá (Điểm trung bình: 4.9/5.0 ★)`);
        console.log("=========================================================\n");

    } catch (err) {
        console.error(" Seed script error:", err);
    } finally {
        await mongoose.disconnect();
        console.log(" Disconnected from MongoDB Atlas.");
    }
}

runResetAndSeed();
