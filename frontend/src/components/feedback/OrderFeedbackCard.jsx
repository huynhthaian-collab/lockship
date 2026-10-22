import { useEffect, useState } from 'react'
import {
    AlertCircle,
    CheckCircle2,
    Lock,
    MessageSquarePlus,
    Sparkles,
    Star,
} from 'lucide-react'
import FeedbackModal from './FeedbackModal.jsx'
import { feedbackApi } from '../../services/feedbackApi.js'

const STATUS_TEXT_MAP = {
    pending: 'Đang chờ xử lý',
    assigned: 'Đã chỉ định tài xế',
    accepted: 'Tài xế đã tiếp nhận',
    'in-progress': 'Đang vận chuyển',
    arrived: 'Đã đến điểm giao (chờ mở khóa)',
    authorized: 'Đã cấp quyền mở khóa',
    completed: 'Đã giao hàng thành công',
    cancelled: 'Đã hủy đơn hàng',
}

export default function OrderFeedbackCard({ deliveryId, deliveryCode, status }) {
    const [modalOpen, setModalOpen] = useState(false)
    const [initialRating, setInitialRating] = useState(5)
    const [existingFeedback, setExistingFeedback] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let active = true
        async function checkFeedback() {
            if (!deliveryId) return
            try {
                const res = await feedbackApi.checkEligibility({ orderId: deliveryId })
                if (active) {
                    if (res?.existingFeedback) {
                        setExistingFeedback(res.existingFeedback)
                    } else if (res?.canReview === false && res?.code === 'ALREADY_REVIEWED') {
                        setExistingFeedback({ rating: 5, comment: res.reason })
                    }
                }
            } catch {
                // Fallback check
                try {
                    const data = await feedbackApi.list({ orderId: deliveryId, limit: 1 })
                    if (active && data?.feedbacks?.length > 0) {
                        setExistingFeedback(data.feedbacks[0])
                    }
                } catch {
                    // Ignore error
                }
            } finally {
                if (active) setLoading(false)
            }
        }
        checkFeedback()
        return () => {
            active = false
        }
    }, [deliveryId])

    function handleStarClick(stars) {
        setInitialRating(stars)
        setModalOpen(true)
    }

    // Only allow when delivery is completed or authorized/unlocked successfully
    const isCompleted =
        status === 'completed' || status === 'authorized' || status === 'delivered'
    const isCancelled = status === 'cancelled'
    const statusLabel = STATUS_TEXT_MAP[status] || status || 'Chưa hoàn tất'

    return (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-amber-500/[0.06] via-blue-500/[0.04] to-emerald-500/[0.04] p-5 sm:p-6 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(251,191,36,0.08)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    {isCompleted ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                            <Sparkles size={12} className="text-amber-400" />
                            Đơn hàng đã bàn giao thành công
                        </div>
                    ) : isCancelled ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-rose-300">
                            <AlertCircle size={12} className="text-rose-400" />
                            Đơn hàng đã bị hủy
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/30 bg-white/[0.04] px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            <Lock size={12} className="text-slate-400" />
                            Đánh giá đang bị khóa ({statusLabel})
                        </div>
                    )}

                    <h3 className="mt-2 text-base sm:text-lg font-bold text-white">
                        {existingFeedback
                            ? 'Đánh giá của bạn về đơn hàng này'
                            : isCompleted
                            ? 'Bạn hài lòng với dịch vụ giao nhận Lockship?'
                            : 'Đánh giá chất lượng dịch vụ giao nhận'}
                    </h3>

                    <p className="mt-1 text-xs text-slate-300 max-w-xl leading-relaxed">
                        {existingFeedback
                            ? `Bạn đã gửi đánh giá ${existingFeedback.rating} sao. Cảm ơn phản hồi quý báu của bạn!`
                            : isCompleted
                            ? 'Đánh giá ngay tốc độ mở khóa chốt điện tử và độ chính xác Geofence để giúp chúng tôi hoàn thiện hơn.'
                            : isCancelled
                            ? 'Đơn hàng đã bị hủy nên không đủ điều kiện gửi đánh giá.'
                            : `Đơn hàng hiện ${statusLabel.toLowerCase()}. Tính năng đánh giá 5 sao sẽ tự động mở khóa sau khi chốt khóa thùng hàng được mở thành công.`}
                    </p>
                </div>

                <div className="shrink-0 flex flex-col sm:items-end gap-2">
                    {existingFeedback ? (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-2.5 text-xs font-semibold text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            <CheckCircle2 size={16} />
                            <span>Đã đánh giá ({existingFeedback.rating} ⭐)</span>
                        </div>
                    ) : isCompleted ? (
                        <>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => handleStarClick(star)}
                                        className="p-1 text-slate-500 hover:text-amber-400 transition transform hover:scale-125"
                                        title={`${star} sao`}
                                    >
                                        <Star size={22} className="hover:fill-amber-400" />
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setInitialRating(5)
                                    setModalOpen(true)
                                }}
                                className="ui-button-primary text-xs font-semibold py-2 px-4 shadow-[0_4px_14px_rgba(37,99,235,0.4)]"
                            >
                                <MessageSquarePlus size={14} />
                                Viết nhận xét
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-slate-500 cursor-not-allowed opacity-75"
                            title="Chỉ có thể đánh giá sau khi hoàn tất giao hàng"
                        >
                            <Lock size={13} />
                            Khóa đánh giá ({statusLabel})
                        </button>
                    )}
                </div>
            </div>

            {/* Modal */}
            <FeedbackModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                orderId={deliveryId}
                orderCode={deliveryCode}
                initialRating={initialRating}
                onSuccess={(fb) => {
                    setExistingFeedback(fb)
                }}
            />
        </div>
    )
}
