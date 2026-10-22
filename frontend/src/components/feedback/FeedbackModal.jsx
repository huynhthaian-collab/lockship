import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    AlertTriangle,
    CheckCircle2,
    Info,
    Lock,
    LogIn,
    MessageSquare,
    Send,
    Sparkles,
    Star,
    X,
} from 'lucide-react'
import StarRating from './StarRating.jsx'
import { feedbackApi } from '../../services/feedbackApi.js'
import { useAuth } from '../../context/useAuth.js'

const POSITIVE_QUICK_TAGS = [
    'Mở khóa siêu nhanh',
    'Giao diện dễ dùng',
    'Tủ khóa an toàn',
    'Shipper nhiệt tình',
    'Bảo mật cao',
    'Hỗ trợ 24/7',
]

const ISSUE_QUICK_TAGS = [
    'Chậm trễ giao hàng',
    'Khó mở khóa IoT',
    'Sự cố chốt cơ điện',
    'Thùng hàng bị va chạm',
    'Shipper thiếu nhiệt tình',
    'Lỗi ứng dụng',
]

// Anti-spam & profanity filters (frontend quick validation)
const SPAM_URL_REGEX = /(https?:\/\/|www\.|\b[a-zA-Z0-9.-]+\.(com|vn|net|org|xyz|top|cc|ru|info|biz)\b)/i
const PROFANITY_WORDS = [
    'đụ', 'địt', 'lồn', 'cặc', 'buồi', 'đéo', 'chó đẻ', 'dcm', 'vcl', 'đm', 'dkm', 'clmm', 'vl', 'fuck', 'shit', 'bitch', 'đĩ', 'đụ má',
]

function containsProfanity(text) {
    if (!text) return false
    const lower = text.toLowerCase()
    return PROFANITY_WORDS.some((word) => {
        const regex = new RegExp(
            '(^|[^a-zA-Z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ])' +
            word +
            '(?=[^a-zA-Z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]|$)',
            'i'
        )
        return regex.test(lower)
    })
}

const REPEATED_CHAR_REGEX = /(.)\1{6,}/

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
    const [selectedTags, setSelectedTags] = useState([])
    const [comment, setComment] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [submittedSuccess, setSubmittedSuccess] = useState(false)

    // Eligibility check state for order or cooldown
    const [checkingEligibility, setCheckingEligibility] = useState(false)
    const [eligibility, setEligibility] = useState({ canReview: true })

    const formId = useId()

    // Reset state and check eligibility when opening
    useEffect(() => {
        if (!open) return

        setRating(initialRating || 5)
        setComment('')
        setError('')
        setSubmittedSuccess(false)
        setSelectedTags(initialRating <= 2 ? ['Khó mở khóa IoT'] : ['Mở khóa siêu nhanh', 'Tủ khóa an toàn'])

        if (isAuthenticated && orderId) {
            let active = true
            setCheckingEligibility(true)
            feedbackApi
                .checkEligibility({ orderId })
                .then((res) => {
                    if (active) {
                        setEligibility(res)
                    }
                })
                .catch((err) => {
                    if (active) {
                        setEligibility({ canReview: false, reason: err.message })
                    }
                })
                .finally(() => {
                    if (active) setCheckingEligibility(false)
                })
            return () => {
                active = false
            }
        } else {
            setEligibility({ canReview: true })
        }
    }, [open, orderId, initialRating, isAuthenticated])

    if (!open) return null

    function toggleTag(tag) {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        )
    }

    // Dynamic tags based on rating
    const currentAvailableTags = rating <= 2 ? ISSUE_QUICK_TAGS : POSITIVE_QUICK_TAGS

    // Compute live inline validation states
    const trimmedComment = comment.trim()
    const isLowRating = rating === 1 || rating === 2

    let validationMessage = ''
    let isCommentValid = true

    if (trimmedComment.length > 0) {
        if (trimmedComment.length < 10) {
            validationMessage = `Nhận xét tối thiểu 10 ký tự (còn thiếu ${10 - trimmedComment.length} ký tự).`
            isCommentValid = false
        } else if (trimmedComment.length > 500) {
            validationMessage = 'Nội dung nhận xét không được vượt quá 500 ký tự.'
            isCommentValid = false
        } else if (containsProfanity(trimmedComment)) {
            validationMessage = 'Nội dung nhận xét chứa từ ngữ không phù hợp với tiêu chuẩn cộng đồng.'
            isCommentValid = false
        } else if (SPAM_URL_REGEX.test(trimmedComment)) {
            validationMessage = 'Nội dung nhận xét không được chứa đường link hoặc quảng cáo rác.'
            isCommentValid = false
        } else if (REPEATED_CHAR_REGEX.test(trimmedComment)) {
            validationMessage = 'Nội dung nhận xét chứa các ký tự lặp vô nghĩa.'
            isCommentValid = false
        }
    }

    // Low rating condition check (1-2 stars)
    const meetsLowRatingCondition = !isLowRating || selectedTags.length > 0 || trimmedComment.length >= 15
    const lowRatingWarning =
        isLowRating && !meetsLowRatingCondition
            ? `Vui lòng chọn ít nhất 1 thẻ nguyên nhân hoặc nhập nhận xét chi tiết (tối thiểu 15 ký tự, hiện có ${trimmedComment.length}/15).`
            : null

    const canSubmit =
        isAuthenticated &&
        eligibility.canReview &&
        rating >= 1 &&
        rating <= 5 &&
        meetsLowRatingCondition &&
        isCommentValid &&
        !submitting

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        if (!isAuthenticated) {
            setError('Bạn cần đăng nhập tài khoản để gửi đánh giá.')
            return
        }

        if (!rating || rating < 1 || rating > 5) {
            setError('Vui lòng chọn số sao đánh giá từ 1 đến 5 sao.')
            return
        }

        if (isLowRating && !meetsLowRatingCondition) {
            setError(lowRatingWarning || 'Vui lòng cung cấp lý do khi đánh giá 1-2 sao.')
            return
        }

        if (!isCommentValid) {
            setError(validationMessage || 'Nội dung nhận xét chưa hợp lệ.')
            return
        }

        setSubmitting(true)
        try {
            const result = await feedbackApi.create({
                rating,
                tags: selectedTags,
                comment: trimmedComment,
                orderId: orderId || null,
                userName: user?.name,
                userRole: user?.role || 'customer',
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

                {/* 1. Condition: User Not Authenticated */}
                {!isAuthenticated ? (
                    <div className="py-8 text-center">
                        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/15 text-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.25)]">
                            <Lock size={32} />
                        </div>
                        <h3 className="mt-5 text-xl font-extrabold text-white">Yêu cầu đăng nhập tài khoản</h3>
                        <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
                            Để bảo vệ tính minh bạch và độ tin cậy của toàn hệ thống, bạn cần đăng nhập tài khoản Lockship trước khi gửi đánh giá 5 sao.
                        </p>
                        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="ui-button-secondary w-full sm:w-auto px-5 py-2.5 text-xs font-semibold"
                            >
                                Đóng lại
                            </button>
                            <Link
                                to="/login"
                                className="ui-button-primary w-full sm:w-auto px-6 py-2.5 text-xs font-bold shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                            >
                                <LogIn size={15} />
                                Đăng nhập ngay
                            </Link>
                        </div>
                    </div>
                ) : submittedSuccess ? (
                    /* 2. Success state */
                    <div className="py-10 text-center">
                        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-scale-in">
                            <CheckCircle2 size={36} />
                        </div>
                        <h3 className="mt-5 text-xl font-extrabold text-white">Cảm ơn bạn đã đánh giá!</h3>
                        <p className="mt-2 text-sm text-slate-300">
                            Phản hồi của bạn đã được ghi nhận vào hệ sinh thái Lockship.
                        </p>
                        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-300">
                            <Sparkles size={14} /> Ghi nhận thành công {rating} sao ⭐
                        </div>
                    </div>
                ) : checkingEligibility ? (
                    /* 3. Loading eligibility */
                    <div className="py-16 text-center">
                        <div className="size-10 mx-auto border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="mt-4 text-xs font-semibold text-slate-400">Đang xác thực điều kiện đánh giá đơn hàng...</p>
                    </div>
                ) : !eligibility.canReview ? (
                    /* 4. Ineligible condition (already reviewed or order not completed) */
                    <div className="py-8 text-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                            <AlertTriangle size={28} />
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-white">
                            {eligibility.code === 'ALREADY_REVIEWED' ? 'Đơn hàng đã được đánh giá' : 'Chưa đủ điều kiện đánh giá'}
                        </h3>
                        <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
                            {eligibility.reason}
                        </p>

                        {eligibility.existingFeedback && (
                            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left max-w-md mx-auto">
                                <div className="flex items-center justify-between text-xs mb-2">
                                    <span className="font-semibold text-slate-400">Đánh giá trước đó:</span>
                                    <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                                        {eligibility.existingFeedback.rating} <Star size={13} className="fill-amber-400" />
                                    </span>
                                </div>
                                <p className="text-xs text-slate-300 italic">
                                    "{eligibility.existingFeedback.comment || 'Không có nhận xét chi tiết'}"
                                </p>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="ui-button-secondary mt-6 px-6 py-2.5 text-xs font-semibold"
                        >
                            Đã hiểu & Đóng
                        </button>
                    </div>
                ) : (
                    /* 5. Main Feedback Submission Form */
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
                                Ý kiến thực tế của bạn là động lực để nâng cao độ bảo mật và tốc độ mở khóa IoT.
                            </p>
                        </header>

                        {error && (
                            <div className="mb-5 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form id={formId} onSubmit={handleSubmit} className="space-y-5">
                            {/* Star Rating Section */}
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm">
                                <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                                    Mức độ hài lòng của bạn <span className="text-amber-400">*</span>
                                </span>
                                <StarRating
                                    rating={rating}
                                    onRatingChange={(newVal) => {
                                        setRating(newVal)
                                        // Reset tags to appropriate group if switching between good/bad
                                        if (newVal <= 2 && rating > 2) {
                                            setSelectedTags(['Khó mở khóa IoT'])
                                        } else if (newVal > 2 && rating <= 2) {
                                            setSelectedTags(['Mở khóa siêu nhanh', 'Tủ khóa an toàn'])
                                        }
                                    }}
                                    size="lg"
                                    showLabel={true}
                                />
                                {rating === 0 && (
                                    <span className="mt-2 text-xs font-medium text-amber-400">
                                        Vui lòng nhấp chọn số sao từ 1 đến 5 sao.
                                    </span>
                                )}
                            </div>

                            {/* Low Star Warning & Rule Banner */}
                            {isLowRating && (
                                <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-3.5 backdrop-blur-sm">
                                    <div className="flex items-start gap-2.5">
                                        <Info size={17} className="text-amber-400 shrink-0 mt-0.5" />
                                        <div className="text-xs">
                                            <p className="font-bold text-amber-300">
                                                Bạn đang đánh giá {rating} sao (Cần khắc phục)
                                            </p>
                                            <p className="mt-1 text-slate-300 leading-relaxed">
                                                Để đảm bảo quyền lợi và hỗ trợ cải thiện, vui lòng <strong className="text-white">chọn ít nhất 1 thẻ nguyên nhân</strong> hoặc <strong className="text-white">nhập lý do chi tiết (tối thiểu 15 ký tự)</strong>.
                                            </p>
                                            {lowRatingWarning && (
                                                <p className="mt-1.5 font-semibold text-rose-300 animate-pulse">
                                                    {lowRatingWarning}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Quick Tags (Chips) */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                                    {isLowRating ? 'Nguyên nhân chưa hài lòng (chọn thẻ):' : 'Điểm nổi bật bạn yêu thích (chọn nhanh):'}
                                    {isLowRating && <span className="ml-1 text-amber-400 font-bold">*</span>}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {currentAvailableTags.map((tag) => {
                                        const isSelected = selectedTags.includes(tag)
                                        return (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => toggleTag(tag)}
                                                className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${
                                                    isSelected
                                                        ? isLowRating
                                                            ? 'border-amber-400 bg-amber-500/20 text-amber-200 font-semibold shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                                                            : 'border-blue-400 bg-blue-500/20 text-white shadow-[0_0_12px_rgba(59,130,246,0.35)] font-semibold'
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

                            {/* Comment Textarea with Character Counter & Inline Validation */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                                        Nhận xét chi tiết {isLowRating && selectedTags.length === 0 && <span className="text-amber-400 font-bold">*</span>}
                                    </label>
                                    <span
                                        className={`text-[11px] font-mono ${
                                            comment.length >= 450
                                                ? 'text-amber-400 font-bold'
                                                : comment.length > 0 && comment.length < 10
                                                ? 'text-rose-400 font-bold'
                                                : 'text-slate-500'
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
                                        placeholder={
                                            isLowRating
                                                ? 'Mô tả chi tiết sự cố bạn gặp phải (ví dụ: thời gian trễ, chốt khóa bị kẹt, thao tác app khó khăn...)'
                                                : 'Chia sẻ trải nghiệm của bạn về tốc độ mở khóa chốt điện tử, độ chính xác GPS hay sự tiện lợi khi sử dụng...'
                                        }
                                        className={`ui-control w-full resize-none text-sm p-3.5 leading-relaxed placeholder:text-slate-600 ${
                                            validationMessage ? 'border-rose-500/60 focus:border-rose-500' : ''
                                        }`}
                                    />
                                    <MessageSquare
                                        size={16}
                                        className="pointer-events-none absolute right-3 bottom-3 text-slate-600"
                                    />
                                </div>

                                {/* Inline Validation Notice */}
                                {validationMessage && (
                                    <p className="mt-1.5 text-xs font-medium text-rose-300 flex items-center gap-1.5">
                                        <AlertTriangle size={13} className="shrink-0" />
                                        {validationMessage}
                                    </p>
                                )}
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
                                    disabled={!canSubmit}
                                    className="ui-button-primary text-xs px-6 py-2.5 font-bold shadow-[0_8px_20px_rgba(37,99,235,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
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
