import { useState } from 'react'
import { CheckCircle2, MessageSquare, Reply, Send, Sparkles, X } from 'lucide-react'
import StarRating from './StarRating.jsx'
import { feedbackApi } from '../../services/feedbackApi.js'

const QUICK_REPLY_TEMPLATES = [
    'Cảm ơn bạn đã tin tưởng đồng hành cùng giải pháp khóa thông minh Lockship!',
    'Đội ngũ Lockship ghi nhận ý kiến quý báu và sẽ tiếp tục tối ưu trải nghiệm ngày càng tốt hơn.',
    'Rất vui vì tính năng mở khóa Geofence 3D đã hỗ trợ hiệu quả cho công việc vận tải của bạn!',
    'Lockship cam kết bảo mật 100% cho mọi chuyến hàng của bạn và đối tác.',
]

export default function AdminReplyModal({
    open,
    onClose,
    feedback,
    onSuccess,
}) {
    const [replyText, setReplyText] = useState(feedback?.adminReply || '')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    if (!open || !feedback) return null

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        setSubmitting(true)
        try {
            const updated = await feedbackApi.update(feedback._id, {
                adminReply: replyText.trim(),
            })
            onSuccess?.(updated)
            onClose()
        } catch (err) {
            setError(err.message || 'Không thể lưu câu trả lời.')
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
                className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-gradient-to-b from-[#111827] via-[#0d1322] to-[#070a12] p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(168,85,247,0.18)]"
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

                <header className="mb-5">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-purple-300">
                        <Reply size={13} className="text-purple-400" />
                        Phản hồi chính thức từ Admin
                    </div>
                    <h3 className="mt-3 text-xl font-extrabold text-white">
                        Trả lời phản hồi của {feedback.userName}
                    </h3>
                </header>

                {/* Original Feedback Preview Box */}
                <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white">{feedback.userName}</span>
                        <StarRating rating={feedback.rating} readOnly={true} size="sm" showLabel={false} />
                    </div>
                    <p className="text-slate-300 italic line-clamp-3 leading-relaxed">
                        &ldquo;{feedback.comment || 'Khách hàng đánh giá không kèm nhận xét.'}&rdquo;
                    </p>
                </div>

                {error && (
                    <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Quick Reply Templates */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                            Mẫu câu trả lời gợi ý
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {QUICK_REPLY_TEMPLATES.map((tmpl, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setReplyText(tmpl)}
                                    className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[11px] text-slate-400 transition hover:border-purple-400/40 hover:bg-purple-500/10 hover:text-purple-300"
                                >
                                    + {tmpl.slice(0, 32)}...
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reply Textarea */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                                Nội dung phản hồi
                            </label>
                            <span className="text-[11px] font-mono text-slate-500">
                                {replyText.length}/1000 ký tự
                            </span>
                        </div>
                        <textarea
                            rows={4}
                            maxLength={1000}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Nhập câu trả lời chính thức từ Ban Quản trị Lockship..."
                            className="ui-control w-full resize-none text-sm p-3.5 leading-relaxed placeholder:text-slate-600"
                        />
                    </div>

                    {/* Actions */}
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
                            disabled={submitting}
                            className="ui-button-primary text-xs px-6 py-2.5 font-bold shadow-[0_8px_20px_rgba(168,85,247,0.35)]"
                        >
                            {submitting ? 'Đang lưu...' : 'Lưu câu trả lời'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
