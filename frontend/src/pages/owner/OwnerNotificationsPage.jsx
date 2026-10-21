import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, CircleDot, ArrowRight, CheckCheck } from 'lucide-react'
import OwnerPage from '../../components/OwnerPage.jsx'
import { OwnerError, OwnerLoading, OwnerNotice } from '../../components/OwnerFeedback.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import { notificationApi } from '../../services/ownerApi.js'

function formatDate(value) {
    return value ? new Date(value).toLocaleString('vi-VN') : '—'
}

export default function OwnerNotificationsPage() {
    const [notifications, setNotifications] = useState([])
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')

    const refresh = useCallback(async () => {
        setError('')
        try {
            const list = await notificationApi.list()
            setNotifications(Array.isArray(list) ? list : [])
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải thông báo.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        let active = true
        async function fetchInitial() {
            try {
                const list = await notificationApi.list()
                if (active) setNotifications(Array.isArray(list) ? list : [])
            } catch (err) {
                if (active) setError(err.message || 'Lỗi kết nối máy chủ')
            } finally {
                if (active) setLoading(false)
            }
        }
        fetchInitial()
        return () => {
            active = false
        }
    }, [])

    const onNewNotification = useCallback((notification) => {
        if (!notification) return
        const notifId = notification._id || notification.id
        setNotifications((current) => [
            notification,
            ...(Array.isArray(current) ? current : []).filter((item) => (item._id || item.id) !== notifId),
        ])
    }, [])

    useSocketEvent('notification:new', onNewNotification)

    async function markRead(id) {
        try {
            const updated = await notificationApi.markRead(id)
            setNotifications((current) =>
                (Array.isArray(current) ? current : []).map((item) =>
                    (item._id === id || item.id === id) ? updated : item
                )
            )
        } catch (requestError) {
            setError(requestError.message || 'Không thể cập nhật thông báo.')
        }
    }

    async function markAllRead() {
        setError('')
        try {
            await notificationApi.markAllRead()
            setNotifications((current) =>
                (Array.isArray(current) ? current : []).map((item) => ({ ...item, isRead: true }))
            )
            setNotice('Đã đánh dấu tất cả thông báo là đã đọc.')
        } catch (requestError) {
            setError(requestError.message || 'Không thể cập nhật thông báo.')
        }
    }

    const safeNotifications = Array.isArray(notifications) ? notifications : []
    const unread = safeNotifications.filter((item) => !item.isRead).length
    const visible = safeNotifications.filter((item) => filter === 'all' || !item.isRead)

    return (
        <OwnerPage
            eyebrow="Hộp thư & Cảnh báo"
            title="Trung tâm thông báo"
            description="Cập nhật tự động các thay đổi trạng thái đơn hàng, cảnh báo chốt khóa và sự cố từ nhân viên."
            action={
                <button
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-slate-200 transition disabled:opacity-40"
                    disabled={!unread}
                    onClick={markAllRead}
                    type="button"
                >
                    <CheckCheck className="h-4 w-4 text-cyan-400" />
                    Đánh dấu tất cả đã đọc
                </button>
            }
        >
            <OwnerError error={error} onRetry={refresh} />
            {notice && <OwnerNotice>{notice}</OwnerNotice>}

            <div className="space-y-6">
                {/* Filter and Unread Bar */}
                <Card className="p-4 border-white/10 bg-slate-900/40">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-sm font-semibold text-white">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                <Bell className="h-4 w-4" />
                            </div>
                            <span>
                                {unread > 0 ? (
                                    <>
                                        Bạn có <strong className="text-cyan-400">{unread}</strong> thông báo chưa đọc
                                    </>
                                ) : (
                                    'Không có thông báo mới'
                                )}
                            </span>
                        </div>

                        <div className="inline-flex rounded-xl border border-white/10 bg-slate-950/60 p-1" aria-label="Lọc thông báo">
                            {['all', 'unread'].map((value) => (
                                <button
                                    aria-pressed={filter === value}
                                    className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                                        filter === value
                                            ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/30'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                    key={value}
                                    onClick={() => setFilter(value)}
                                    type="button"
                                >
                                    {value === 'all' ? 'Tất cả' : 'Chưa đọc'}
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Notifications List */}
                {loading ? (
                    <OwnerLoading label="Đang tải các thông báo..." />
                ) : visible.length === 0 ? (
                    <Card className="p-12 text-center border-dashed border-white/10 bg-slate-900/20">
                        <Bell className="mx-auto h-10 w-10 text-slate-600 mb-3" />
                        <p className="text-sm font-semibold text-slate-300">
                            {filter === 'unread' ? 'Bạn đã đọc hết mọi thông báo' : 'Hộp thư trống'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            Các cập nhật về đơn hàng, phân công và tín hiệu IoT sẽ tự động xuất hiện tại đây
                        </p>
                    </Card>
                ) : (
                    <Card className="p-0 border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl overflow-hidden">
                        <ol className="divide-y divide-white/5">
                            {visible.map((item) => {
                                const key = item._id || item.id
                                const typeLabel = (item.type || '').replaceAll('_', ' ')

                                return (
                                    <li
                                        className={`flex flex-col gap-3 p-5 transition hover:bg-white/[0.02] sm:flex-row sm:items-start sm:justify-between ${
                                            item.isRead ? '' : 'bg-cyan-500/[0.04] border-l-2 border-l-cyan-400'
                                        }`}
                                        key={key}
                                    >
                                        <div className="flex min-w-0 gap-3.5">
                                            <span
                                                className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${
                                                    item.isRead
                                                        ? 'border-white/10 bg-white/5 text-slate-400'
                                                        : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                                                }`}
                                            >
                                                <CircleDot aria-hidden="true" size={16} />
                                            </span>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                                                    {!item.isRead && (
                                                        <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                                                            Mới
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-xs leading-relaxed text-slate-300">{item.message}</p>
                                                <p className="mt-2 text-[11px] font-mono text-slate-400">
                                                    {formatDate(item.createdAt)} {typeLabel ? `· ${typeLabel}` : ''}
                                                </p>
                                                {item.deliveryId && (
                                                    <Link
                                                        className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
                                                        to={`/owner/deliveries/${item.deliveryId}`}
                                                    >
                                                        Xem đơn giao hàng liên quan
                                                        <ArrowRight className="h-3 w-3" />
                                                    </Link>
                                                )}
                                            </div>
                                        </div>

                                        {!item.isRead && (
                                            <button
                                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition shrink-0 self-start"
                                                onClick={() => markRead(key)}
                                                type="button"
                                            >
                                                <Check size={13} />
                                                Đánh dấu đã đọc
                                            </button>
                                        )}
                                    </li>
                                )
                            })}
                        </ol>
                    </Card>
                )}
            </div>
        </OwnerPage>
    )
}