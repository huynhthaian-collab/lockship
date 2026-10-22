import { useEffect, useState } from 'react'
import {
    Award,
    CheckCircle,
    MessageSquarePlus,
    Quote,
    RefreshCw,
    Sparkles,
    Star,
    Users,
} from 'lucide-react'
import StarRating from './StarRating.jsx'
import { RATING_EMOTIONS } from './ratingConstants.js'
import FeedbackModal from './FeedbackModal.jsx'
import { feedbackApi } from '../../services/feedbackApi.js'

function formatRelativeTime(dateString) {
    if (!dateString) return 'Gần đây'
    try {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now - date
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffHours / 24)

        if (diffHours < 1) return 'Vừa xong'
        if (diffHours < 24) return `${diffHours} giờ trước`
        if (diffDays === 1) return 'Hôm qua'
        if (diffDays < 7) return `${diffDays} ngày trước`
        return date.toLocaleDateString('vi-VN')
    } catch {
        return 'Gần đây'
    }
}

const ROLE_CONFIGS = {
    owner: { label: 'Chủ hàng / Doanh nghiệp', badge: 'border-blue-400/30 bg-blue-500/10 text-blue-300' },
    shipper: { label: 'Tài xế đối tác', badge: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' },
    admin: { label: 'Quản trị viên', badge: 'border-purple-400/30 bg-purple-500/10 text-purple-300' },
    customer: { label: 'Khách nhận hàng', badge: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300' },
    guest: { label: 'Khách hàng Lockship', badge: 'border-slate-400/30 bg-slate-500/10 text-slate-300' },
}

export default function FeedbackSection({ id = 'feedback', className = '' }) {
    const [data, setData] = useState({
        feedbacks: [],
        totalReviews: 0,
        averageRating: 5.0,
        ratingDistribution: {
            5: { count: 0, percentage: 100 },
            4: { count: 0, percentage: 0 },
            3: { count: 0, percentage: 0 },
            2: { count: 0, percentage: 0 },
            1: { count: 0, percentage: 0 },
        },
    })
    const [loading, setLoading] = useState(true)
    const [filterStar, setFilterStar] = useState('all')
    const [modalOpen, setModalOpen] = useState(false)

    async function loadData() {
        setLoading(true)
        try {
            const result = await feedbackApi.list({ limit: 30 })
            setData(result)
        } catch (err) {
            console.error('Failed to load feedback:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const filteredFeedbacks = (data.feedbacks || []).filter((item) => {
        if (filterStar === 'all') return true
        return item.rating === Number(filterStar)
    })

    return (
        <section id={id} className={`relative py-16 sm:py-24 text-white overflow-hidden ${className}`}>
            {/* Background Glow Accents */}
            <div className="glow-orb-blue -top-32 -left-32 opacity-25" />
            <div className="glow-orb-emerald -bottom-32 -right-32 opacity-25" />

            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-14">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.25)]">
                        <Sparkles size={13} className="text-amber-400" />
                        Đánh giá 5 sao & Phản hồi thực tế
                    </div>
                    <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                        Khách hàng nói gì về{' '}
                        <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-amber-300 bg-clip-text text-transparent">
                            Lockship?
                        </span>
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
                        Hơn 98% đối tác vận tải và người dùng đánh giá cao độ an toàn tuyệt đối của chốt khóa cơ điện tử và tốc độ mở khóa tức thì qua Geofence.
                    </p>
                </div>

                <div className="grid gap-8 lg:grid-cols-12 items-start">
                    {/* Left Column: Rating Score Overview Card (4 cols) */}
                    <div className="lg:col-span-4">
                        <div className="spatial-card p-6 sm:p-8 rounded-3xl border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
                            <div className="text-center pb-6 border-b border-white/10">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Điểm chất lượng dịch vụ
                                </span>
                                <div className="mt-2 flex items-baseline justify-center gap-2">
                                    <span className="text-5xl sm:text-6xl font-black tracking-tight text-white drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                                        {data.averageRating ? data.averageRating.toFixed(1) : '5.0'}
                                    </span>
                                    <span className="text-xl font-bold text-slate-400">/ 5.0</span>
                                </div>

                                <div className="mt-3 flex justify-center">
                                    <StarRating
                                        rating={Math.round(data.averageRating || 5)}
                                        readOnly={true}
                                        size="md"
                                        showLabel={false}
                                    />
                                </div>

                                <p className="mt-2 text-xs text-slate-400">
                                    Dựa trên{' '}
                                    <strong className="text-white font-bold">
                                        {data.totalReviews || 0} lượt đánh giá
                                    </strong>{' '}
                                    xác thực
                                </p>
                            </div>

                            {/* Rating Breakdown Bars */}
                            <div className="py-6 space-y-2.5 border-b border-white/10">
                                {[5, 4, 3, 2, 1].map((stars) => {
                                    const dist = data.ratingDistribution?.[stars] || { count: 0, percentage: 0 }
                                    return (
                                        <div key={stars} className="flex items-center gap-3 text-xs">
                                            <span className="w-8 text-right font-medium text-slate-300 flex items-center justify-end gap-1">
                                                {stars} <Star size={12} className="fill-amber-400 text-amber-400" />
                                            </span>
                                            <div className="relative h-2 flex-1 rounded-full bg-white/[0.06] overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.5)] transition-all duration-500"
                                                    style={{ width: `${dist.percentage}%` }}
                                                />
                                            </div>
                                            <span className="w-9 text-right font-mono text-[11px] text-slate-400">
                                                {dist.count}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Trust Metrics */}
                            <div className="pt-5 space-y-3">
                                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                                    <CheckCircle size={15} className="text-emerald-400 shrink-0" />
                                    <span>100% Đánh giá từ người dùng thực tế</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                                    <Award size={15} className="text-blue-400 shrink-0" />
                                    <span>Tiêu chuẩn bảo mật Geofence quân sự AES-256</span>
                                </div>
                            </div>

                            {/* CTA Trigger */}
                            <button
                                type="button"
                                onClick={() => setModalOpen(true)}
                                className="ui-button-primary mt-6 w-full py-3.5 text-xs sm:text-sm font-bold shadow-[0_10px_25px_-5px_rgba(37,99,235,0.6)]"
                            >
                                <MessageSquarePlus size={16} />
                                Viết đánh giá của bạn
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Feedbacks List & Filter (8 cols) */}
                    <div className="lg:col-span-8 space-y-5">
                        {/* Filters & Refresh Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 backdrop-blur-md">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline">
                                    Lọc theo:
                                </span>
                                {[
                                    { id: 'all', label: 'Tất cả' },
                                    { id: '5', label: '5 sao ⭐' },
                                    { id: '4', label: '4 sao ⭐' },
                                    { id: '3', label: '3 sao ⭐' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setFilterStar(tab.id)}
                                        className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                                            filterStar === tab.id
                                                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.5)] font-semibold'
                                                : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={loadData}
                                disabled={loading}
                                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition"
                                title="Làm mới danh sách"
                            >
                                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                                <span>Cập nhật</span>
                            </button>
                        </div>

                        {/* Feedback List */}
                        {filteredFeedbacks.length === 0 ? (
                            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center">
                                <Users size={32} className="mx-auto text-slate-600" />
                                <h4 className="mt-3 text-sm font-semibold text-slate-300">
                                    Chưa có đánh giá nào cho bộ lọc này
                                </h4>
                                <p className="mt-1 text-xs text-slate-500">
                                    Hãy là người đầu tiên chia sẻ cảm nhận của bạn về Lockship!
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(true)}
                                    className="ui-button-primary mt-4 py-2 px-4 text-xs font-semibold"
                                >
                                    Đánh giá ngay
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {filteredFeedbacks.map((fb) => {
                                    const roleInfo = ROLE_CONFIGS[fb.userRole] || ROLE_CONFIGS.customer
                                    const emotion = RATING_EMOTIONS[fb.rating]

                                    return (
                                        <div
                                            key={fb._id || fb.createdAt}
                                            className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5.5 backdrop-blur-md transition-all duration-300 hover:border-blue-400/40 hover:bg-white/[0.06] hover:shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(59,130,246,0.15)] hover:-translate-y-1"
                                        >
                                            <Quote
                                                size={32}
                                                className="pointer-events-none absolute top-4 right-4 text-white/[0.03] transition-colors group-hover:text-blue-500/[0.08]"
                                            />

                                            <div>
                                                {/* Header: User Avatar, Name, Role, Date */}
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-bold text-white shadow-md">
                                                            {fb.userName ? fb.userName.charAt(0).toUpperCase() : 'L'}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                                                                {fb.userName || 'Khách hàng Lockship'}
                                                            </h4>
                                                            <span
                                                                className={`inline-block mt-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${roleInfo.badge}`}
                                                            >
                                                                {roleInfo.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                                                        {formatRelativeTime(fb.createdAt)}
                                                    </span>
                                                </div>

                                                {/* Stars & Emotion */}
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="flex items-center gap-0.5">
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <Star
                                                                key={s}
                                                                size={13}
                                                                className={
                                                                    s <= fb.rating
                                                                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                                                                        : 'fill-transparent text-slate-700'
                                                                }
                                                            />
                                                        ))}
                                                    </div>
                                                    {emotion && (
                                                        <span className="text-[11px] font-semibold text-amber-300">
                                                            {emotion.label}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Tags */}
                                                {Array.isArray(fb.tags) && fb.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                                        {fb.tags.map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="rounded-lg border border-white/5 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-slate-300"
                                                            >
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Comment */}
                                                <p className="text-xs leading-relaxed text-slate-300 sm:text-sm line-clamp-4">
                                                    {fb.comment || 'Khách hàng đã đánh giá dịch vụ 5 sao hài lòng.'}
                                                </p>
                                            </div>

                                            {/* Order Badge if associated */}
                                            {fb.orderId && (
                                                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                                                    <span className="font-mono text-blue-400">
                                                        Đơn #{String(fb.orderId).slice(-6).toUpperCase()}
                                                    </span>
                                                    <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[10px]">
                                                        <CheckCircle size={11} /> Đã xác thực giao nhận
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Interactive Feedback Modal */}
            <FeedbackModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={(newFb) => {
                    setData((prev) => ({
                        ...prev,
                        feedbacks: [newFb, ...prev.feedbacks],
                        totalReviews: prev.totalReviews + 1,
                    }))
                }}
            />
        </section>
    )
}
