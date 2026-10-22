import { useState } from 'react'
import { CheckCircle2, Pin, Sparkles, X } from 'lucide-react'
import StarRating from './StarRating.jsx'
import { feedbackApi } from '../../services/feedbackApi.js'

const AVAILABLE_TAGS = [
    'Mở khóa siêu nhanh',
    'Giao diện dễ dùng',
    'Tủ khóa an toàn',
    'Shipper nhiệt tình',
    'Bảo mật cao',
    'Hỗ trợ 24/7',
    'Chống trộm thông minh',
    'Định vị Geofence chuẩn',
]

export default function AdminFeedbackModal({
    open,
    onClose,
    feedback = null, // if present -> edit mode; if null -> create mode
    onSuccess,
}) {
    const isEdit = Boolean(feedback)
    const [userName, setUserName] = useState(feedback?.userName || '')
    const [userRole, setUserRole] = useState(feedback?.userRole || 'owner')
    const [rating, setRating] = useState(feedback?.rating || 5)
    const [selectedTags, setSelectedTags] = useState(feedback?.tags || ['Mở khóa siêu nhanh', 'Tủ khóa an toàn'])
    const [comment, setComment] = useState(feedback?.comment || '')
    const [isPinned, setIsPinned] = useState(feedback?.isPinned || false)
    const [isVisible, setIsVisible] = useState(feedback?.isVisible !== false)
    const [adminReply, setAdminReply] = useState(feedback?.adminReply || '')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    if (!open) return null

    function toggleTag(tag) {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        )
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        if (!userName.trim()) {
            setError('Vui lòng nhập tên khách hàng hoặc đối tác.')
            return
        }

        if (!rating || rating < 1 || rating > 5) {
            setError('Vui lòng chọn số sao đánh giá (1-5 sao).')
            return
        }

        setSubmitting(true)
        try {
            const payload = {
                userName: userName.trim(),
                userRole,
                rating,
                tags: selectedTags,
                comment: comment.trim(),
                isPinned,
                isVisible,
                adminReply: adminReply.trim() || null,
            }

            let result
            if (isEdit) {
                result = await feedbackApi.update(feedback._id, payload)
            } else {
                result = await feedbackApi.adminCreate(payload)
            }

            onSuccess?.(result)
            onClose()
        } catch (err) {
            setError(err.message || 'Không thể lưu đánh giá.')
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
                className="relative w-full max-w-xl rounded-3xl border border-white/15 bg-gradient-to-b from-[#111827] via-[#0d1322] to-[#070a12] p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(59,130,246,0.18)]"
            >
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="absolute top-5 right-5 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                    aria-label="Đóng"
                >
                    <X size={18} />
                </button>

                <header className="mb-6">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-300">
                        <Sparkles size={13} className="text-blue-400" />
                        {isEdit ? 'Chỉnh sửa đánh giá' : 'Tạo đánh giá / Testimonial mới'}
                    </div>
                    <h3 className="mt-3 text-2xl font-extrabold text-white">
                        {isEdit ? 'Cập nhật thông tin đánh giá' : 'Thêm đánh giá mới vào hệ thống'}
                    </h3>
                </header>

                {error && (
                    <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    {/* User Name & Role */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                                Tên người đánh giá *
                            </label>
                            <input
                                type="text"
                                required
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="Ví dụ: Trần Hoàng Nam"
                                className="ui-control w-full text-sm py-2"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                                Vai trò / Đối tượng
                            </label>
                            <select
                                value={userRole}
                                onChange={(e) => setUserRole(e.target.value)}
                                className="ui-control w-full text-sm py-2"
                            >
                                <option value="owner">Chủ hàng / Doanh nghiệp</option>
                                <option value="shipper">Tài xế giao nhận</option>
                                <option value="customer">Khách nhận hàng</option>
                                <option value="admin">Ban Quản trị</option>
                                <option value="guest">Khách hàng vãng lai</option>
                            </select>
                        </div>
                    </div>

                    {/* Star Rating */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col items-center">
                        <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-2">
                            Số sao đánh giá (1 - 5)
                        </label>
                        <StarRating rating={rating} onRatingChange={setRating} size="md" showLabel={true} />
                    </div>

                    {/* Quick Tags */}
                    <div>
                        <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                            Thẻ nổi bật (Tags)
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {AVAILABLE_TAGS.map((tag) => {
                                const isSel = selectedTags.includes(tag)
                                return (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => toggleTag(tag)}
                                        className={`rounded-lg border px-2.5 py-1 text-[11px] transition ${
                                            isSel
                                                ? 'border-blue-400 bg-blue-500/20 text-white font-semibold'
                                                : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {isSel ? '✓ ' : '+ '}
                                        {tag}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                            Nội dung nhận xét *
                        </label>
                        <textarea
                            rows={3}
                            maxLength={500}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Nhập nội dung đánh giá thực tế của đối tác hoặc người dùng..."
                            className="ui-control w-full resize-none text-sm p-3 placeholder:text-slate-600"
                        />
                    </div>

                    {/* Admin Reply (Optional) */}
                    <div>
                        <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                            Câu trả lời của Ban Quản trị (Tùy chọn)
                        </label>
                        <textarea
                            rows={2}
                            maxLength={1000}
                            value={adminReply}
                            onChange={(e) => setAdminReply(e.target.value)}
                            placeholder="Nhập câu trả lời chính thức của Admin hiển thị ngay bên dưới (nếu có)..."
                            className="ui-control w-full resize-none text-sm p-2.5 placeholder:text-slate-600"
                        />
                    </div>

                    {/* Toggles: isPinned & isVisible */}
                    <div className="grid gap-3 sm:grid-cols-2 pt-1">
                        <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 cursor-pointer hover:bg-white/[0.04] transition">
                            <input
                                type="checkbox"
                                checked={isPinned}
                                onChange={(e) => setIsPinned(e.target.checked)}
                                className="size-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                                <p className="font-bold text-white flex items-center gap-1">
                                    <Pin size={13} className="text-amber-400" /> Ghim lên đầu
                                </p>
                                <p className="text-[11px] text-slate-400">Hiển thị ưu tiên hàng đầu trên trang chủ</p>
                            </div>
                        </label>

                        <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 cursor-pointer hover:bg-white/[0.04] transition">
                            <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={(e) => setIsVisible(e.target.checked)}
                                className="size-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                                <p className="font-bold text-white">Hiển thị công khai</p>
                                <p className="text-[11px] text-slate-400">Cho phép người dùng bên ngoài nhìn thấy</p>
                            </div>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
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
                            disabled={submitting}
                            className="ui-button-primary text-xs px-6 py-2.5 font-bold shadow-[0_8px_20px_rgba(37,99,235,0.4)]"
                        >
                            {submitting ? 'Đang lưu...' : isEdit ? 'Cập nhật đánh giá' : 'Tạo đánh giá mới'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
