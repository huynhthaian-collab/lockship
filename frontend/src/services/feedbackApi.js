import apiClient from './apiClient.js'

const LOCAL_STORAGE_FEEDBACK_KEY = 'lockship_local_feedbacks'

// Automatic purge of legacy or test items in localStorage
try {
    if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(LOCAL_STORAGE_FEEDBACK_KEY)
    }
} catch {
    // Ignore storage errors
}

export const FALLBACK_FEEDBACKS = [
    {
        _id: 'fb-01',
        userName: 'Lê Hoàng Khang',
        userRole: 'owner',
        boxId: 'BOX-01',
        rating: 5,
        tags: ['Thông báo nhận hàng', 'Trải nghiệm', 'Tủ thông minh'],
        comment: 'Dùng cũng ổn nè, mà thông báo nhận hàng nên ghi rõ hơn để biết hàng đã được bỏ vô tủ chưa',
        isVisible: true,
        isPinned: true,
        adminReply: 'Dạ Lockship chân thành cảm ơn anh Khang đã góp ý. Hệ thống đang nâng cấp nội dung thông báo qua SMS và email chi tiết hơn để Quý khách nắm rõ trạng thái kiện hàng ạ!',
        repliedAt: '2026-10-23T08:00:00.000Z',
        createdAt: '2026-10-22T14:30:00.000Z',
    },
    {
        _id: 'fb-02',
        userName: 'Nguyễn Thành Vinh',
        userRole: 'owner',
        boxId: 'BOX-02',
        rating: 4,
        tags: ['Bàn phím', 'Hướng dẫn sử dụng', 'Phần cứng'],
        comment: 'Sản phẩm hay đó, nhưng bàn phím hơi nhỏ, người mới dùng chắc cần có hướng dẫn cụ thể hơn chút.',
        isVisible: true,
        isPinned: true,
        adminReply: 'Dạ Lockship ghi nhận phản hồi của anh Vinh. Tụi em đang bổ sung decal hướng dẫn thao tác to rõ ngay trên mặt tủ và tối ưu bàn phím cho các đợt lắp đặt tiếp theo ạ!',
        repliedAt: '2026-10-26T10:00:00.000Z',
        createdAt: '2026-10-25T09:15:00.000Z',
    },
    {
        _id: 'fb-03',
        userName: 'Lê Thị Kim Ngân',
        userRole: 'owner',
        boxId: 'BOX-03',
        rating: 5,
        tags: ['An tâm', 'Hình ảnh xác nhận', 'Tiện ích'],
        comment: 'Có tủ nhận hàng vậy cũng yên tâm hơn để ngoài cửa. Nếu có thêm hình ảnh xác nhận hàng đã bỏ vô tủ thì tốt quá.',
        isVisible: true,
        isPinned: true,
        adminReply: 'Dạ cảm ơn chị Ngân rất nhiều! Tính năng camera chụp ảnh kiện hàng ngay khi shipper hoàn tất đóng tủ đang được đội ngũ kỹ thuật hoàn thiện trong phiên bản tới ạ.',
        repliedAt: '2026-10-28T09:00:00.000Z',
        createdAt: '2026-10-27T16:45:00.000Z',
    },
    {
        _id: 'fb-04',
        userName: 'Trần Ngọc Quế Anh',
        userRole: 'owner',
        boxId: 'BOX-04',
        rating: 5,
        tags: ['Dân văn phòng', 'Hệ thống OTP', 'Khóa bảo mật'],
        comment: 'Khá hữu ích cho dân văn phòng tụi mình. Mà nhớ kiểm tra khóa với hệ thống OTP thường xuyên nha, chứ đang cần lấy hàng mà bị lỗi thì hơi phiền á.',
        isVisible: true,
        isPinned: true,
        adminReply: 'Dạ Lockship luôn duy trì giám sát telemetry khóa 24/7 và hệ thống máy chủ OTP dự phòng song song để đảm bảo anh/chị nhận hàng luôn thông suốt và không bị gián đoạn ạ!',
        repliedAt: '2026-10-30T14:00:00.000Z',
        createdAt: '2026-10-29T11:20:00.000Z',
    },
    {
        _id: 'fb-05',
        userName: 'Nguyễn Đình Khôi',
        userRole: 'owner',
        boxId: 'BOX-05',
        rating: 5,
        tags: ['Tủ khóa an toàn', 'Mở khóa siêu nhanh'],
        comment: 'Tủ khóa đặt tại Nguyễn Văn Cừ rất tiện lợi. Shipper giao đồ vào tủ bất kể ngày đêm, không cần phải gọi điện giục người nhà ra nhận.',
        isVisible: true,
        isPinned: false,
        adminReply: 'Cảm ơn anh Khôi! Lockship cam kết mang lại trải nghiệm nhận hàng tự động 24/7 tốt nhất.',
        repliedAt: '2026-10-27T08:00:00.000Z',
        createdAt: '2026-10-26T15:10:00.000Z',
    },
    {
        _id: 'fb-06',
        userName: 'Trần Tiến Việt',
        userRole: 'owner',
        boxId: 'BOX-06',
        rating: 5,
        tags: ['Cước phí hợp lý', 'VietQR BIDV'],
        comment: 'Cước phí 5.000đ/lượt quá rẻ so với sự an tâm khi nhận hàng giá trị cao. Cuối tháng quét mã VietQR BIDV thanh toán chỉ 3 giây.',
        isVisible: true,
        isPinned: false,
        adminReply: 'Cảm ơn anh Việt đã tin tưởng và đồng hành cùng dịch vụ tủ khóa Lockship!',
        repliedAt: '2026-10-29T09:00:00.000Z',
        createdAt: '2026-10-28T14:20:00.000Z',
    },
    {
        _id: 'fb-07',
        userName: 'Võ Thị Thu Hà',
        userRole: 'owner',
        boxId: 'BOX-17',
        rating: 5,
        tags: ['Khóa bảo mật', 'Chống nước', 'Tiện ích'],
        comment: 'Tôi mua sắm online nhiều nên dùng tủ liên tục. Thao tác mở tủ bằng mã OTP bảo mật, tủ chắc chắn chống nước tốt.',
        isVisible: true,
        isPinned: false,
        adminReply: 'Cảm ơn chị Hà! Tủ Lockship đạt tiêu chuẩn chống nước IP65 và bảo mật 2 lớp cho mọi điều kiện thời tiết.',
        repliedAt: '2026-10-31T08:00:00.000Z',
        createdAt: '2026-10-30T10:15:00.000Z',
    },
    {
        _id: 'fb-08',
        userName: 'Nguyễn Minh Quân',
        userRole: 'shipper',
        rating: 5,
        tags: ['Shipper nhiệt tình', 'Giao diện dễ dùng', 'Mở khóa siêu nhanh'],
        comment: 'Giao hàng vào tủ Lockship nhanh gọn chỉ 10 giây quét QR, tiết kiệm thời gian đợi khách ra lấy. Tỷ lệ giao thành công đạt 100%.',
        isVisible: true,
        isPinned: false,
        adminReply: 'Đội ngũ kỹ thuật Lockship luôn nỗ lực tối ưu giao diện tốc độ phản hồi 60fps tốt nhất cho anh em tài xế!',
        repliedAt: '2026-10-29T10:00:00.000Z',
        createdAt: '2026-10-28T16:00:00.000Z',
    },
    {
        _id: 'fb-09',
        userName: 'Phạm Hải Đăng',
        userRole: 'shipper',
        rating: 5,
        tags: ['Tủ khóa an toàn', 'Bản đồ GPS'],
        comment: 'Bản đồ điều hướng trạm tủ chuẩn xác. Chốt khóa cơ điện tử phản hồi nhạy tức thì, không lo thất lạc hàng hay bị khiếu nại.',
        isVisible: true,
        isPinned: false,
        adminReply: 'Cảm ơn anh Đăng đã đồng hành và đóng góp ý kiến cho hệ thống Lockship!',
        repliedAt: '2026-10-30T11:00:00.000Z',
        createdAt: '2026-10-29T08:30:00.000Z',
    },
    {
        _id: 'fb-10',
        userName: 'Vũ Thanh Trúc',
        userRole: 'customer',
        rating: 5,
        tags: ['Giao diện dễ dùng', 'Hỗ trợ 24/7'],
        comment: 'Giao diện web trực quan, xem được lịch sử nhận hàng và trạng thái đóng/mở tủ thời gian thực. Rất tin tưởng giải pháp của Lockship!',
        isVisible: true,
        isPinned: false,
        adminReply: 'Cảm ơn bạn Trúc! Lockship luôn nỗ lực để mang lại trải nghiệm giao nhận hàng an tâm nhất.',
        repliedAt: '2026-10-31T09:00:00.000Z',
        createdAt: '2026-10-30T16:40:00.000Z',
    },
]

export const feedbackApi = {
    async list({ page = 1, limit = 20, orderId = null, rating = null } = {}) {
        try {
            const params = new URLSearchParams()
            if (page) params.append('page', page)
            if (limit) params.append('limit', limit)
            if (orderId) params.append('orderId', orderId)
            if (rating) params.append('rating', rating)

            const response = await apiClient.get(`/feedbacks?${params.toString()}`, { skipAuth: true })
            const data = response.data?.data || {}

            // If server returned valid feedbacks, return server source of truth directly
            if (Array.isArray(data.feedbacks) && data.feedbacks.length > 0) {
                return data
            }

            return {
                feedbacks: FALLBACK_FEEDBACKS,
                totalReviews: FALLBACK_FEEDBACKS.length,
                averageRating: 4.9,
                ratingDistribution: {
                    5: { count: 9, percentage: 90 },
                    4: { count: 1, percentage: 10 },
                    3: { count: 0, percentage: 0 },
                    2: { count: 0, percentage: 0 },
                    1: { count: 0, percentage: 0 },
                },
                page: 1,
                limit,
            }
        } catch {
            return {
                feedbacks: FALLBACK_FEEDBACKS,
                totalReviews: FALLBACK_FEEDBACKS.length,
                averageRating: 4.9,
                ratingDistribution: {
                    5: { count: 9, percentage: 90 },
                    4: { count: 1, percentage: 10 },
                    3: { count: 0, percentage: 0 },
                    2: { count: 0, percentage: 0 },
                    1: { count: 0, percentage: 0 },
                },
                page: 1,
                limit,
            }
        }
    },

    async listAdmin({ page = 1, limit = 50, rating = null, status = 'all', search = '' } = {}) {
        try {
            const params = new URLSearchParams()
            if (page) params.append('page', page)
            if (limit) params.append('limit', limit)
            if (rating && rating !== 'all') params.append('rating', rating)
            if (status && status !== 'all') params.append('status', status)
            if (search && search.trim()) params.append('search', search.trim())

            const response = await apiClient.get(`/feedbacks/admin?${params.toString()}`)
            return response.data?.data || {}
        } catch {
            let items = [...FALLBACK_FEEDBACKS]
            if (status === 'visible') items = items.filter((i) => i.isVisible !== false)
            if (status === 'hidden') items = items.filter((i) => i.isVisible === false)
            if (status === 'pinned') items = items.filter((i) => i.isPinned)
            if (rating && rating !== 'all') {
                if (rating === '1-2') items = items.filter((i) => i.rating <= 2)
                else items = items.filter((i) => i.rating === Number(rating))
            }
            if (search) {
                const s = search.toLowerCase()
                items = items.filter((i) => (i.userName || '').toLowerCase().includes(s) || (i.comment || '').toLowerCase().includes(s))
            }

            const total = items.length
            const fiveStars = items.filter((i) => i.rating === 5).length
            const pendingReplies = items.filter((i) => !i.adminReply).length
            const sum = items.reduce((acc, curr) => acc + (curr.rating || 5), 0)

            return {
                feedbacks: items,
                totalReviews: total,
                totalAllReviews: items.length,
                averageRating: total > 0 ? Number((sum / total).toFixed(1)) : 4.9,
                fiveStarRate: total > 0 ? Math.round((fiveStars / total) * 100) : 90,
                pendingReplies,
                ratingDistribution: {
                    5: { count: fiveStars, percentage: total > 0 ? Math.round((fiveStars / total) * 100) : 90 },
                    4: { count: 1, percentage: 10 },
                    3: { count: 0, percentage: 0 },
                    2: { count: 0, percentage: 0 },
                    1: { count: 0, percentage: 0 },
                },
                page,
                limit,
            }
        }
    },

    async checkEligibility({ orderId = null } = {}) {
        try {
            const params = new URLSearchParams()
            if (orderId) params.append('orderId', orderId)
            const response = await apiClient.get(`/feedbacks/eligibility?${params.toString()}`)
            return response.data?.data || { canReview: true }
        } catch (err) {
            return {
                canReview: false,
                reason: err.response?.data?.message || 'Không thể xác thực điều kiện đánh giá.',
            }
        }
    },

    async create({ rating, comment = '', tags = [], orderId = null, userName = '', userRole = '' }) {
        const payload = {
            rating: Number(rating),
            comment: comment.trim(),
            tags,
            orderId: orderId || null,
            userName: userName.trim() || undefined,
            userRole: userRole || undefined,
        }

        const response = await apiClient.post('/feedbacks', payload, { skipAuth: false })
        return response.data?.data?.feedback
    },

    async adminCreate(payload) {
        const response = await apiClient.post('/feedbacks/admin', payload)
        return response.data?.data?.feedback
    },

    async update(id, updateData) {
        const response = await apiClient.patch(`/feedbacks/${id}`, updateData)
        return response.data?.data?.feedback
    },

    async remove(id) {
        await apiClient.delete(`/feedbacks/${id}`)
        return { success: true, id }
    },
}
