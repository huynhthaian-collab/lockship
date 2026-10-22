import { useState } from 'react'
import { CheckCircle2, MessageSquare, Send, Sparkles, X } from 'lucide-react'
import StarRating from './StarRating.jsx'
import { feedbackApi } from '../../services/feedbackApi.js'
import { useAuth } from '../../context/useAuth.js'

const SUGGESTED_QUICK_TAGS = [
    'Mở khóa siêu nhanh',
    'Giao diện dễ dùng',
    'Tủ khóa an toàn',
    'Shipper nhiệt tình',
    'Bảo mật cao',
    'Hỗ trợ 24/7',
]

export default function FeedbackModal({
    open,
    onClose,
    onSuccess,
    orderId = null,
    orderCode = null,
    initialRating = 5,
}) {
    const { user, isAuthenticated } = useAuth()
    const [rating, setRating] = useState(initialRating || 5)
    const [selectedTags, setSelectedTags] = useState(['Mở khóa siêu nhanh', 'Tủ khóa an toàn'])
    const [comment, setComment] = useState('')
    const [userName, setUserName] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [submittedSuccess, setSubmittedSuccess] = useState(false)

    if (!open) return null

    function toggleTag(tag) {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        )
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        if (!rating || rating < 1 || rating > 5) {
            setError('Vui lòng chọn số sao đánh giá từ 1 đến 5 sao.')
            return
        }

        if (comment.length > 500) {
            setError('Nội dung nhận xét không được vượt quá 500 ký tự.')
            return
        }

        setSubmitting(true)
        try {
            const result = await feedbackApi.create({
                rating,
                tags: selectedTags,
                comment,
                orderId: orderId || null,
                userName: isAuthenticated ? user?.name : (userName.trim() || 'Khách hàng Lockship'),
                userRole: isAuthenticated ? user?.role : 'customer',
            })

            setSubmittedSuccess(true)
            onSuccess?.(result)

            setTimeout(() => {
                setSubmittedSuccess(false)
                onClose()
            }, 1800)
        } catch (err) {
            setError(err.message || 'Không thể gửi đánh giá. Vui lòng thử lại.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-xl animate-fade-in"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !submitting) onClose()
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-gradient-to-b from-[#111827] via-[#0d1322] to-[#070a12] p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(59,130,246,0.18)]"
            >
                {/* Ambient glowing accent */}
                <div className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-blue-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 -left-16 size-40 rounded-full bg-amber-500/15 blur-3xl" />

                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="absolute top-5 right-5 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                    aria-label="Đóng cửa sổ"
                >
                    <X size={18} />
                </button>

                {submittedSuccess ? (
                    <div className="py-10 text-center">
                        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-scale-in">
                            <CheckCircle2 size={36} />
                        </div>
                        <h3 className="mt-5 text-xl font-extrabold text-white">Cảm ơn bạn đã đánh giá!</h3>
                        <p className="mt-2 text-sm text-slate-300">
                            Phản hồi của bạn giúp hệ sinh thái khóa thông minh Lockship không ngừng hoàn thiện.
                        </p>
                        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-300">
                            <Sparkles size={14} /> Ghi nhận thành công 5 sao
                        </div>
                    </div>
                ) : (
                    <>
                        <header className="mb-6">
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.2)]">
                                <Sparkles size={13} className="text-blue-400" />
                                {orderId ? `Đánh giá đơn hàng #${orderCode || orderId.slice(-6).toUpperCase()}` : 'Gửi ý kiến đóng góp & Đánh giá'}
                            </div>
                            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white">
                                {orderId ? 'Trải nghiệm giao nhận của bạn thế nào?' : 'Đánh giá dịch vụ Lockship'}
                            </h2>
                            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                                Ý kiến của bạn là động lực để chúng tôi nâng cao độ bảo mật và tốc độ mở khóa.
                            </p>
                        </header>

                        {error && (
                            <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Star Rating Section */}
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm">
                                <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                                    Mức độ hài lòng của bạn
                                </span>
                                <StarRating
                                    rating={rating}
                                    onRatingChange={setRating}
                                    size="lg"
                                    showLabel={true}
                                />
                            </div>

                            {/* Quick Tags (Chips) */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2.5">
                                    Điểm nổi bật bạn yêu thích (chọn nhanh)
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {SUGGESTED_QUICK_TAGS.map((tag) => {
                                        const isSelected = selectedTags.includes(tag)
                                        return (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => toggleTag(tag)}
                                                className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${
                                                    isSelected
                                                        ? 'border-blue-400 bg-blue-500/20 text-white shadow-[0_0_12px_rgba(59,130,246,0.35)] font-semibold'
                                                        : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200'
                                                }`}
                                            >
                                                {isSelected ? '✓ ' : '+ '}
                                                {tag}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Guest Name input if not authenticated */}
                            {!isAuthenticated && (
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                                        Tên của bạn (Tùy chọn)
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={100}
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        placeholder="Ví dụ: Hoàng Nam (hoặc để trống là Khách hàng)"
                                        className="ui-control w-full text-sm py-2.5"
                                    />
                                </div>
                            )}

                            {/* Comment Textarea with Character Counter */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                                        Nhận xét chi tiết
                                    </label>
                                    <span
                                        className={`text-[11px] font-mono ${
                                            comment.length >= 450 ? 'text-amber-400 font-bold' : 'text-slate-500'
                                        }`}
                                    >
                                        {comment.length}/500 ký tự
                                    </span>
                                </div>
                                <div className="relative">
                                    <textarea
                                        rows={4}
                                        maxLength={500}
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Chia sẻ trải nghiệm của bạn về tốc độ mở khóa chốt điện tử, độ chính xác GPS hay sự tiện lợi khi sử dụng..."
                                        className="ui-control w-full resize-none text-sm p-3.5 leading-relaxed placeholder:text-slate-600"
                                    />
                                    <MessageSquare
                                        size={16}
                                        className="pointer-events-none absolute right-3 bottom-3 text-slate-600"
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={submitting}
                                    className="ui-button-secondary text-xs px-4 py-2.5"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || rating === 0}
                                    className="ui-button-primary text-xs px-6 py-2.5 font-bold shadow-[0_8px_20px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="size-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                            </svg>
                                            Đang ghi nhận...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5">
                                            <Send size={14} /> Gửi đánh giá ngay
                                        </span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}
