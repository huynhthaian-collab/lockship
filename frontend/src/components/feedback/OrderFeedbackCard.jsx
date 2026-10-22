import { useEffect, useState } from 'react'
import { CheckCircle2, MessageSquarePlus, Sparkles, Star } from 'lucide-react'
import FeedbackModal from './FeedbackModal.jsx'
import { feedbackApi } from '../../services/feedbackApi.js'

export default function OrderFeedbackCard({ deliveryId, deliveryCode, status }) {
    const [modalOpen, setModalOpen] = useState(false)
    const [initialRating, setInitialRating] = useState(5)
    const [existingFeedback, setExistingFeedback] = useState(null)

    useEffect(() => {
        let active = true
        async function checkFeedback() {
            if (!deliveryId) return
            try {
                const data = await feedbackApi.list({ orderId: deliveryId, limit: 1 })
                if (active && data?.feedbacks?.length > 0) {
                    setExistingFeedback(data.feedbacks[0])
                }
            } catch {
                // Ignore error
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

    // Only show when delivery is completed or authorized/unlocked successfully
    const isCompleted = status === 'completed' || status === 'authorized'

    if (!isCompleted) return null

    return (
        <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/[0.08] via-blue-500/[0.05] to-emerald-500/[0.05] p-5 sm:p-6 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(251,191,36,0.12)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                        <Sparkles size={12} className="text-amber-400" />
                        Đơn hàng đã bàn giao thành công
                    </div>
                    <h3 className="mt-2 text-base sm:text-lg font-bold text-white">
                        {existingFeedback ? 'Đánh giá của bạn về đơn hàng này' : 'Bạn hài lòng với dịch vụ giao nhận Lockship?'}
                    </h3>
                    <p className="mt-1 text-xs text-slate-300">
                        {existingFeedback
                            ? `Bạn đã gửi đánh giá ${existingFeedback.rating} sao. Cảm ơn phản hồi quý báu!`
                            : 'Đánh giá ngay tốc độ mở khóa chốt điện tử và độ chính xác Geofence để giúp chúng tôi hoàn thiện hơn.'}
                    </p>
                </div>

                <div className="shrink-0 flex flex-col sm:items-end gap-2">
                    {existingFeedback ? (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300">
                            <CheckCircle2 size={16} />
                            <span>Đã đánh giá ({existingFeedback.rating} ⭐)</span>
                        </div>
                    ) : (
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
