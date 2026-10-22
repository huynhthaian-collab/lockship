import { useCallback, useEffect, useState } from 'react'
import {
    CheckCircle2,
    Edit3,
    Eye,
    EyeOff,
    MessageSquare,
    MessageSquarePlus,
    Pin,
    PinOff,
    Plus,
    RefreshCw,
    Reply,
    Search,
    Sparkles,
    Star,
    Trash2,
    Users,
} from 'lucide-react'
import AdminPage from '../../components/AdminPage.jsx'
import StarRating from '../../components/feedback/StarRating.jsx'
import AdminReplyModal from '../../components/feedback/AdminReplyModal.jsx'
import AdminFeedbackModal from '../../components/feedback/AdminFeedbackModal.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { feedbackApi } from '../../services/feedbackApi.js'

function formatDateTime(dateStr) {
    if (!dateStr) return '—'
    try {
        return new Date(dateStr).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })
    } catch {
        return '—'
    }
}

const ROLE_BADGES = {
    owner: { label: 'Chủ hàng', class: 'border-blue-400/30 bg-blue-500/10 text-blue-300' },
    shipper: { label: 'Tài xế', class: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' },
    customer: { label: 'Khách hàng', class: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300' },
    admin: { label: 'Admin', class: 'border-purple-400/30 bg-purple-500/10 text-purple-300' },
    guest: { label: 'Vãng lai', class: 'border-slate-400/30 bg-slate-500/10 text-slate-300' },
}

export default function AdminFeedbacksPage() {
    const [feedbacks, setFeedbacks] = useState([])
    const [stats, setStats] = useState({
        totalReviews: 0,
        averageRating: 5.0,
        fiveStarRate: 100,
        pendingReplies: 0,
    })
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [ratingFilter, setRatingFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')

    // Modals state
    const [createModalOpen, setCreateModalOpen] = useState(false)
    const [editFeedback, setEditFeedback] = useState(null)
    const [replyFeedback, setReplyFeedback] = useState(null)
    const [deleteFeedbackItem, setDeleteFeedbackItem] = useState(null)
    const [actionBusy, setActionBusy] = useState(false)

    const fetchFeedbacks = useCallback(async () => {
        setLoading(true)
        try {
            const result = await feedbackApi.listAdmin({
                rating: ratingFilter,
                status: statusFilter,
                search,
                limit: 100,
            })
            setFeedbacks(result.feedbacks || [])
            setStats({
                totalReviews: result.totalReviews || result.feedbacks?.length || 0,
                averageRating: result.averageRating || 5.0,
                fiveStarRate: result.fiveStarRate ?? 100,
                pendingReplies: result.pendingReplies ?? 0,
            })
        } catch (err) {
            console.error('Failed to load admin feedbacks:', err)
        } finally {
            setLoading(false)
        }
    }, [ratingFilter, statusFilter, search])

    useEffect(() => {
        fetchFeedbacks()
    }, [fetchFeedbacks])

    async function handleToggleVisibility(item) {
        const newVisible = !item.isVisible
        // Optimistic UI update
        setFeedbacks((prev) =>
            prev.map((fb) => (fb._id === item._id ? { ...fb, isVisible: newVisible } : fb))
        )
        try {
            await feedbackApi.update(item._id, { isVisible: newVisible })
        } catch (err) {
            console.error('Update visibility failed:', err)
            fetchFeedbacks()
        }
    }

    async function handleTogglePin(item) {
        const newPinned = !item.isPinned
        // Optimistic UI update
        setFeedbacks((prev) =>
            prev.map((fb) => (fb._id === item._id ? { ...fb, isPinned: newPinned } : fb))
        )
        try {
            await feedbackApi.update(item._id, { isPinned: newPinned })
        } catch (err) {
            console.error('Update pin failed:', err)
            fetchFeedbacks()
        }
    }

    async function handleConfirmDelete() {
        if (!deleteFeedbackItem) return
        setActionBusy(true)
        const targetId = deleteFeedbackItem._id
        // Optimistic update
        setFeedbacks((prev) => prev.filter((fb) => fb._id !== targetId))
        try {
            await feedbackApi.remove(targetId)
            setDeleteFeedbackItem(null)
        } catch (err) {
            console.error('Delete failed:', err)
            fetchFeedbacks()
        } finally {
            setActionBusy(false)
        }
    }

    return (
        <AdminPage
            eyebrow="Hệ thống Đánh giá & Phản hồi"
            title="Quản lý Đánh giá & Feedback"
            description="Giám sát điểm đánh giá 5 sao, quản lý ý kiến đóng góp của đối tác và khách hàng, ghim đánh giá tiêu biểu và gửi phản hồi từ Ban Quản trị."
            action={
                <button
                    type="button"
                    onClick={() => setCreateModalOpen(true)}
                    className="ui-button-primary flex items-center gap-2 py-2.5 px-4 text-xs font-bold shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                >
                    <Plus size={16} /> Thêm đánh giá mới
                </button>
            }
        >
            {/* Analytics Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="spatial-card p-5 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Tổng số đánh giá
                        </span>
                        <span className="grid size-9 place-items-center rounded-xl border border-blue-400/30 bg-blue-500/15 text-blue-400">
                            <MessageSquare size={16} />
                        </span>
                    </div>
                    <p className="mt-3 text-3xl font-black text-white tabular-nums">
                        {stats.totalReviews}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Toàn bộ phản hồi trong hệ thống</p>
                </div>

                <div className="spatial-card p-5 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Điểm trung bình
                        </span>
                        <span className="grid size-9 place-items-center rounded-xl border border-amber-400/30 bg-amber-500/15 text-amber-400">
                            <Star size={16} className="fill-amber-400" />
                        </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1.5">
                        <span className="text-3xl font-black text-white tabular-nums">
                            {stats.averageRating ? stats.averageRating.toFixed(1) : '5.0'}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">/ 5.0 ⭐</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Mức độ hài lòng của khách hàng</p>
                </div>

                <div className="spatial-card p-5 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Tỷ lệ 5 sao
                        </span>
                        <span className="grid size-9 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-400">
                            <Sparkles size={16} />
                        </span>
                    </div>
                    <p className="mt-3 text-3xl font-black text-emerald-400 tabular-nums">
                        {stats.fiveStarRate}%
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Khách hàng đánh giá hoàn hảo</p>
                </div>

                <div className="spatial-card p-5 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Chờ Admin trả lời
                        </span>
                        <span className="grid size-9 place-items-center rounded-xl border border-purple-400/30 bg-purple-500/15 text-purple-400">
                            <Reply size={16} />
                        </span>
                    </div>
                    <p className="mt-3 text-3xl font-black text-purple-300 tabular-nums">
                        {stats.pendingReplies}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Đánh giá chưa có câu trả lời</p>
                </div>
            </div>

            {/* Filters & Search Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 backdrop-blur-md">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Star filter */}
                    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1 text-xs">
                        {[
                            { id: 'all', label: 'Tất cả sao' },
                            { id: '5', label: '5 ⭐' },
                            { id: '4', label: '4 ⭐' },
                            { id: '3', label: '3 ⭐' },
                            { id: '1-2', label: '1-2 ⭐' },
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                type="button"
                                onClick={() => setRatingFilter(btn.id)}
                                className={`rounded-lg px-2.5 py-1 font-medium transition ${
                                    ratingFilter === btn.id
                                        ? 'bg-blue-600 text-white font-semibold'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    {/* Status filter */}
                    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1 text-xs">
                        {[
                            { id: 'all', label: 'Tất cả TT' },
                            { id: 'visible', label: 'Hiển thị' },
                            { id: 'hidden', label: 'Đã ẩn' },
                            { id: 'pinned', label: 'Đã ghim 📌' },
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                type="button"
                                onClick={() => setStatusFilter(btn.id)}
                                className={`rounded-lg px-2.5 py-1 font-medium transition ${
                                    statusFilter === btn.id
                                        ? 'bg-purple-600 text-white font-semibold'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Search Input */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Tìm kiếm người dùng, nội dung..."
                            className="ui-control py-1.5 pl-8 pr-3 text-xs w-56 sm:w-64"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={fetchFeedbacks}
                        disabled={loading}
                        className="flex size-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/10 hover:text-white transition"
                        title="Tải lại"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Feedbacks Grid / List */}
            {feedbacks.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center">
                    <Users size={32} className="mx-auto text-slate-600" />
                    <h3 className="mt-3 text-base font-semibold text-white">Không tìm thấy đánh giá phù hợp</h3>
                    <p className="mt-1 text-xs text-slate-400">
                        Thử điều chỉnh lại bộ lọc hoặc tạo một đánh giá mẫu mới.
                    </p>
                    <button
                        type="button"
                        onClick={() => setCreateModalOpen(true)}
                        className="ui-button-primary mt-4 py-2 px-4 text-xs font-semibold"
                    >
                        + Tạo đánh giá mới
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {feedbacks.map((fb) => {
                        const roleInfo = ROLE_BADGES[fb.userRole] || ROLE_BADGES.customer

                        return (
                            <div
                                key={fb._id}
                                className={`rounded-2xl border p-5 sm:p-6 backdrop-blur-md transition-all duration-300 ${
                                    fb.isPinned
                                        ? 'border-amber-400/40 bg-gradient-to-r from-amber-500/[0.05] via-[#0d1322] to-[#0a0f1d] shadow-[0_0_20px_rgba(251,191,36,0.12)]'
                                        : fb.isVisible === false
                                        ? 'border-white/5 bg-white/[0.01] opacity-60'
                                        : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                                }`}
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="flex-1">
                                        {/* Header Row: User Info + Badges */}
                                        <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                                            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-bold text-white shadow-sm">
                                                {fb.userName ? fb.userName.charAt(0).toUpperCase() : 'L'}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white">{fb.userName}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${roleInfo.class}`}>
                                                        {roleInfo.label}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        {formatDateTime(fb.createdAt)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Status indicators */}
                                            <div className="ml-auto flex items-center gap-2">
                                                {fb.isPinned && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                                                        <Pin size={10} className="fill-amber-400" /> Đã ghim
                                                    </span>
                                                )}
                                                {fb.isVisible === false ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-rose-300">
                                                        <EyeOff size={10} /> Đã ẩn
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                                        <Eye size={10} /> Hiển thị
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stars & Tags */}
                                        <div className="flex flex-wrap items-center gap-3 my-2.5">
                                            <StarRating rating={fb.rating} readOnly={true} size="sm" showLabel={true} />
                                            {Array.isArray(fb.tags) && fb.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {fb.tags.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-slate-300"
                                                        >
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {fb.orderId && (
                                                <span className="font-mono text-[10px] text-blue-400 border border-blue-400/30 rounded px-1.5 py-0.5">
                                                    Đơn #{String(fb.orderId).slice(-6).toUpperCase()}
                                                </span>
                                            )}
                                        </div>

                                        {/* Comment Content */}
                                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed my-2">
                                            {fb.comment || 'Không kèm nhận xét.'}
                                        </p>

                                        {/* Admin Reply Box if present */}
                                        {fb.adminReply && (
                                            <div className="mt-3.5 rounded-xl border border-purple-400/30 bg-purple-500/[0.08] p-3 text-xs">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-bold text-purple-300 flex items-center gap-1.5">
                                                        <Reply size={12} /> Phản hồi từ Ban Quản trị Lockship
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        {formatDateTime(fb.repliedAt)}
                                                    </span>
                                                </div>
                                                <p className="text-slate-300 leading-relaxed pl-4 border-l border-purple-400/40">
                                                    {fb.adminReply}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons Toolbar */}
                                    <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-2 lg:pt-0 lg:border-l lg:border-white/10 lg:pl-4">
                                        {/* Reply Button */}
                                        <button
                                            type="button"
                                            onClick={() => setReplyFeedback(fb)}
                                            className="flex items-center gap-1.5 rounded-xl border border-purple-400/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition active:scale-95"
                                            title="Trả lời phản hồi này"
                                        >
                                            <Reply size={13} />
                                            <span>{fb.adminReply ? 'Sửa trả lời' : 'Trả lời'}</span>
                                        </button>

                                        {/* Pin / Unpin */}
                                        <button
                                            type="button"
                                            onClick={() => handleTogglePin(fb)}
                                            className={`flex items-center gap-1 rounded-xl border p-2 text-xs transition active:scale-95 ${
                                                fb.isPinned
                                                    ? 'border-amber-400/40 bg-amber-500/15 text-amber-300'
                                                    : 'border-white/10 bg-white/[0.04] text-slate-400 hover:text-white'
                                            }`}
                                            title={fb.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                                        >
                                            {fb.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                                        </button>

                                        {/* Toggle Visibility */}
                                        <button
                                            type="button"
                                            onClick={() => handleToggleVisibility(fb)}
                                            className={`flex items-center gap-1 rounded-xl border p-2 text-xs transition active:scale-95 ${
                                                fb.isVisible === false
                                                    ? 'border-rose-400/40 bg-rose-500/15 text-rose-300'
                                                    : 'border-white/10 bg-white/[0.04] text-slate-400 hover:text-white'
                                            }`}
                                            title={fb.isVisible === false ? 'Hiện đánh giá' : 'Ẩn đánh giá'}
                                        >
                                            {fb.isVisible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>

                                        {/* Edit */}
                                        <button
                                            type="button"
                                            onClick={() => setEditFeedback(fb)}
                                            className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-400 hover:text-white hover:bg-white/10 transition active:scale-95"
                                            title="Chỉnh sửa nội dung"
                                        >
                                            <Edit3 size={14} />
                                        </button>

                                        {/* Delete */}
                                        <button
                                            type="button"
                                            onClick={() => setDeleteFeedbackItem(fb)}
                                            className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-rose-400 hover:bg-rose-500/20 transition active:scale-95"
                                            title="Xóa đánh giá"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Create Custom Feedback Modal */}
            <AdminFeedbackModal
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onSuccess={(newFb) => {
                    setFeedbacks((prev) => [newFb, ...prev])
                    setStats((prev) => ({
                        ...prev,
                        totalReviews: prev.totalReviews + 1,
                    }))
                }}
            />

            {/* Edit Feedback Modal */}
            <AdminFeedbackModal
                open={Boolean(editFeedback)}
                feedback={editFeedback}
                onClose={() => setEditFeedback(null)}
                onSuccess={(updatedFb) => {
                    setFeedbacks((prev) =>
                        prev.map((fb) => (fb._id === updatedFb._id ? updatedFb : fb))
                    )
                }}
            />

            {/* Reply Modal */}
            <AdminReplyModal
                open={Boolean(replyFeedback)}
                feedback={replyFeedback}
                onClose={() => setReplyFeedback(null)}
                onSuccess={(updatedFb) => {
                    setFeedbacks((prev) =>
                        prev.map((fb) => (fb._id === updatedFb._id ? updatedFb : fb))
                    )
                }}
            />

            {/* Confirm Delete Dialog */}
            <Modal
                open={Boolean(deleteFeedbackItem)}
                title="Xác nhận xóa đánh giá"
                description={`Bạn có chắc chắn muốn xóa vĩnh viễn đánh giá của "${deleteFeedbackItem?.userName}"? Hành động này không thể hoàn tác.`}
                onClose={() => setDeleteFeedbackItem(null)}
                footer={
                    <div className="flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={() => setDeleteFeedbackItem(null)}
                            disabled={actionBusy}
                            className="ui-button-secondary text-xs px-4 py-2"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmDelete}
                            disabled={actionBusy}
                            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition shadow-[0_4px_14px_rgba(225,29,72,0.4)]"
                        >
                            {actionBusy ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
                        </button>
                    </div>
                }
            />
        </AdminPage>
    )
}
