import apiClient from './apiClient.js'

const LOCAL_STORAGE_FEEDBACK_KEY = 'lockship_local_feedbacks'

const FALLBACK_FEEDBACKS = [
    {
        _id: 'fb-sample-1',
        userName: 'Trần Hoàng Nam',
        userRole: 'owner',
        rating: 5,
        tags: ['Mở khóa siêu nhanh', 'Tủ khóa an toàn', 'Bảo mật cao'],
        comment: 'Hệ thống Geofence 3D và khóa chốt cơ điện tử hoạt động cực kỳ chính xác. Vừa tới điểm giao là chốt khóa tự động cấp quyền mở, đội xe 15 chiếc của tôi an tâm tuyệt đối!',
        isVisible: true,
        isPinned: true,
        adminReply: 'Cảm ơn anh Nam đã tin tưởng đồng hành cùng giải pháp bảo vệ thùng xe Lockship 3D!',
        repliedAt: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
        _id: 'fb-sample-2',
        userName: 'Nguyễn Minh Quân',
        userRole: 'shipper',
        rating: 5,
        tags: ['Giao diện dễ dùng', 'Mở khóa siêu nhanh', 'Shipper nhiệt tình'],
        comment: 'Ứng dụng tài xế giao diện tối rất mượt, bản đồ GPS chỉ đường chuẩn xác từng mét. Không còn cảnh đứng chờ lấy mã khóa như trước nữa.',
        isVisible: true,
        isPinned: false,
        adminReply: 'Đội ngũ kỹ thuật Lockship luôn nỗ lực tối ưu giao diện tốc độ phản hồi 60fps tốt nhất cho anh em tài xế!',
        repliedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
    {
        _id: 'fb-sample-3',
        userName: 'Vũ Thanh Trúc',
        userRole: 'owner',
        rating: 5,
        tags: ['Tủ khóa an toàn', 'Hỗ trợ 24/7', 'Bảo mật cao'],
        comment: 'Dịch vụ khách hàng và giám sát telemetry trực tiếp qua WebSocket 60fps đỉnh cao. Rất phù hợp cho doanh nghiệp vận tải hàng giá trị cao.',
        isVisible: true,
        isPinned: true,
        adminReply: null,
        repliedAt: null,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        _id: 'fb-sample-4',
        userName: 'Đoàn Lê Bảo',
        userRole: 'customer',
        rating: 5,
        tags: ['Mở khóa siêu nhanh', 'Giao diện dễ dùng'],
        comment: 'Nhận hàng an toàn, quy trình mở tủ bảo mật cao. Thiết kế web nhìn rất tương lai và chuyên nghiệp!',
        isVisible: true,
        isPinned: false,
        adminReply: null,
        repliedAt: null,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
        _id: 'fb-sample-5',
        userName: 'Phạm Hải Đăng',
        userRole: 'shipper',
        rating: 4,
        tags: ['Tủ khóa an toàn', 'Shipper nhiệt tình'],
        comment: 'Hệ thống cảnh báo an toàn rung chấn nhạy bén. Rất tiện lợi cho anh em tài xế đi đường dài.',
        isVisible: true,
        isPinned: false,
        adminReply: 'Ghi nhận đóng góp từ anh Đăng. Phiên bản tới sẽ bổ sung thêm tính năng rung phản hồi xúc giác!',
        repliedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
]

function getLocalFeedbacks() {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_FEEDBACK_KEY)
        return stored ? JSON.parse(stored) : []
    } catch {
        return []
    }
}

function saveLocalFeedback(feedback) {
    try {
        const existing = getLocalFeedbacks()
        const updated = [feedback, ...existing.filter((item) => item._id !== feedback._id)]
        localStorage.setItem(LOCAL_STORAGE_FEEDBACK_KEY, JSON.stringify(updated.slice(0, 50)))
    } catch {
        // Ignore quota errors
    }
}

function updateLocalFeedback(id, fields) {
    try {
        const existing = getLocalFeedbacks()
        const updated = existing.map((item) => (item._id === id ? { ...item, ...fields } : item))
        localStorage.setItem(LOCAL_STORAGE_FEEDBACK_KEY, JSON.stringify(updated))
    } catch {
        // Ignore
    }
}

function removeLocalFeedback(id) {
    try {
        const existing = getLocalFeedbacks()
        const updated = existing.filter((item) => item._id !== id)
        localStorage.setItem(LOCAL_STORAGE_FEEDBACK_KEY, JSON.stringify(updated))
    } catch {
        // Ignore
    }
}

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

            const localList = getLocalFeedbacks()
            if (localList.length > 0 && !orderId) {
                const existingIds = new Set((data.feedbacks || []).map((f) => f._id))
                const extraLocal = localList.filter((item) => !existingIds.has(item._id) && item.isVisible !== false)
                data.feedbacks = [...extraLocal, ...(data.feedbacks || [])]
                data.totalReviews = (data.totalReviews || 0) + extraLocal.length
            }

            return data
        } catch {
            const localList = getLocalFeedbacks()
            const allFeedbacks = [...localList, ...FALLBACK_FEEDBACKS].filter((item) => item.isVisible !== false)

            const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            let sum = 0
            allFeedbacks.forEach((f) => {
                const r = f.rating || 5
                counts[r] = (counts[r] || 0) + 1
                sum += r
            })
            const total = allFeedbacks.length

            return {
                feedbacks: allFeedbacks,
                totalReviews: total,
                averageRating: total > 0 ? Number((sum / total).toFixed(1)) : 4.9,
                ratingDistribution: {
                    5: { count: counts[5], percentage: total > 0 ? Math.round((counts[5] / total) * 100) : 80 },
                    4: { count: counts[4], percentage: total > 0 ? Math.round((counts[4] / total) * 100) : 20 },
                    3: { count: counts[3], percentage: 0 },
                    2: { count: counts[2], percentage: 0 },
                    1: { count: counts[1], percentage: 0 },
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
            // Local fallback for admin demo/offline
            let items = [...getLocalFeedbacks(), ...FALLBACK_FEEDBACKS]
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
                fiveStarRate: total > 0 ? Math.round((fiveStars / total) * 100) : 100,
                pendingReplies,
                ratingDistribution: {
                    5: { count: fiveStars, percentage: total > 0 ? Math.round((fiveStars / total) * 100) : 80 },
                    4: { count: 1, percentage: 20 },
                    3: { count: 0, percentage: 0 },
                    2: { count: 0, percentage: 0 },
                    1: { count: 0, percentage: 0 },
                },
                page,
                limit,
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

        try {
            const response = await apiClient.post('/feedbacks', payload, { skipAuth: false })
            const feedback = response.data?.data?.feedback || {
                _id: 'fb-' + Date.now(),
                ...payload,
                isVisible: true,
                isPinned: false,
                createdAt: new Date().toISOString(),
            }
            saveLocalFeedback(feedback)
            return feedback
        } catch {
            const fallbackFeedback = {
                _id: 'local-' + Date.now(),
                ...payload,
                userName: payload.userName || 'Bạn',
                userRole: payload.userRole || 'customer',
                isVisible: true,
                isPinned: false,
                createdAt: new Date().toISOString(),
            }
            saveLocalFeedback(fallbackFeedback)
            return fallbackFeedback
        }
    },

    async adminCreate(payload) {
        try {
            const response = await apiClient.post('/feedbacks/admin', payload)
            const feedback = response.data?.data?.feedback || {
                _id: 'fb-admin-' + Date.now(),
                ...payload,
                createdAt: new Date().toISOString(),
            }
            saveLocalFeedback(feedback)
            return feedback
        } catch {
            const localFallback = {
                _id: 'local-admin-' + Date.now(),
                ...payload,
                createdAt: new Date().toISOString(),
            }
            saveLocalFeedback(localFallback)
            return localFallback
        }
    },

    async update(id, updateData) {
        try {
            const response = await apiClient.patch(`/feedbacks/${id}`, updateData)
            const updated = response.data?.data?.feedback
            if (updated) {
                updateLocalFeedback(id, updated)
            }
            return updated
        } catch {
            updateLocalFeedback(id, updateData)
            return { _id: id, ...updateData }
        }
    },

    async remove(id) {
        try {
            await apiClient.delete(`/feedbacks/${id}`)
            removeLocalFeedback(id)
            return { success: true, id }
        } catch {
            removeLocalFeedback(id)
            return { success: true, id }
        }
    },
}
