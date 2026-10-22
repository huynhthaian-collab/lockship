import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, CarFront, ClipboardList, LockKeyhole, Package, RefreshCw, Star, Users, Wifi } from 'lucide-react'
import AdminPage from '../../components/AdminPage.jsx'
import ErrorMessage from '../../components/ErrorMessage.jsx'
import Loading from '../../components/Loading.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import Card from '../../components/ui/Card.jsx'
import Table from '../../components/ui/Table.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import SpatialTiltCard from '../../components/spatial/SpatialTiltCard.jsx'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import { adminApi } from '../../services/adminApi.js'
import { feedbackApi } from '../../services/feedbackApi.js'

function AdminMetricCard({ to, label, value, detail, icon: Icon, tone = 'blue' }) {
    const toneStyles = {
        blue: {
            iconBg: 'border-blue-400/30 bg-blue-500/15 text-blue-400 shadow-[0_0_16px_rgba(59,130,246,0.25)]',
            text: 'text-white',
        },
        emerald: {
            iconBg: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.25)]',
            text: 'text-white',
        },
        cyan: {
            iconBg: 'border-cyan-400/30 bg-cyan-500/15 text-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.25)]',
            text: 'text-white',
        },
        purple: {
            iconBg: 'border-purple-400/30 bg-purple-500/15 text-purple-400 shadow-[0_0_16px_rgba(168,85,247,0.25)]',
            text: 'text-white',
        },
        amber: {
            iconBg: 'border-amber-400/30 bg-amber-500/15 text-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.25)]',
            text: 'text-white',
        },
        yellow: {
            iconBg: 'border-yellow-400/30 bg-yellow-500/15 text-yellow-400 shadow-[0_0_16px_rgba(234,179,8,0.25)]',
            text: 'text-white',
        },
    }

    const current = toneStyles[tone] || toneStyles.blue

    return (
        <SpatialTiltCard className="rounded-2xl" maxTilt={6}>
            <Link
                to={to}
                className="spatial-card group block p-5 no-underline transition-all duration-300 hover:border-cyan-400/40"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
                        <p className={`mt-2 text-3xl font-extrabold tabular-nums tracking-tight ${current.text}`}>
                            {value}
                        </p>
                        <div className="mt-2 text-xs text-slate-400">{detail}</div>
                    </div>
                    <span className={`grid size-11 shrink-0 place-items-center rounded-2xl border transition-transform duration-300 group-hover:scale-110 ${current.iconBg}`}>
                        <Icon size={20} strokeWidth={2.2} />
                    </span>
                </div>
            </Link>
        </SpatialTiltCard>
    )
}

export default function AdminDashboardPage() {
    const [summary, setSummary] = useState(null)
    const [healthStatus, setHealthStatus] = useState(null)
    const [feedbackStats, setFeedbackStats] = useState({ total: 0, averageRating: 5.0, pendingReplies: 0 })
    const [recentFeedbacks, setRecentFeedbacks] = useState([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const refresh = useCallback(async (isSilent = false) => {
        if (!isSilent) setError('')
        setRefreshing(true)
        try {
            const [users, vehicles, deliveries, devices, reports, health, feedbackData] = await Promise.all([
                adminApi.users().catch(() => []),
                adminApi.vehicles().catch(() => []),
                adminApi.deliveries().catch(() => []),
                adminApi.devices().catch(() => []),
                adminApi.reports().catch(() => []),
                adminApi.health().catch(() => ({ success: false, message: 'Không thể kết nối' })),
                feedbackApi.listAdmin({ limit: 4 }).catch(() => ({ feedbacks: [], analytics: { total: 0, averageRating: 5.0, pendingReplies: 0 } })),
            ])
            setSummary({
                users: Array.isArray(users) ? users : [],
                vehicles: Array.isArray(vehicles) ? vehicles : [],
                deliveries: Array.isArray(deliveries) ? deliveries : [],
                devices: Array.isArray(devices) ? devices : [],
                reports: Array.isArray(reports) ? reports : [],
            })
            setHealthStatus(health)
            if (feedbackData?.analytics) {
                setFeedbackStats(feedbackData.analytics)
            }
            if (Array.isArray(feedbackData?.feedbacks)) {
                setRecentFeedbacks(feedbackData.feedbacks)
            }
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải tổng quan quản trị.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        let active = true
        async function init() {
            try {
                const [users, vehicles, deliveries, devices, reports, health, feedbackData] = await Promise.all([
                    adminApi.users().catch(() => []),
                    adminApi.vehicles().catch(() => []),
                    adminApi.deliveries().catch(() => []),
                    adminApi.devices().catch(() => []),
                    adminApi.reports().catch(() => []),
                    adminApi.health().catch(() => ({ success: false, message: 'Không thể kết nối' })),
                    feedbackApi.listAdmin({ limit: 4 }).catch(() => ({ feedbacks: [], analytics: { total: 0, averageRating: 5.0, pendingReplies: 0 } })),
                ])
                if (active) {
                    setSummary({
                        users: Array.isArray(users) ? users : [],
                        vehicles: Array.isArray(vehicles) ? vehicles : [],
                        deliveries: Array.isArray(deliveries) ? deliveries : [],
                        devices: Array.isArray(devices) ? devices : [],
                        reports: Array.isArray(reports) ? reports : [],
                    })
                    setHealthStatus(health)
                    if (feedbackData?.analytics) {
                        setFeedbackStats(feedbackData.analytics)
                    }
                    if (Array.isArray(feedbackData?.feedbacks)) {
                        setRecentFeedbacks(feedbackData.feedbacks)
                    }
                    setLoading(false)
                }
            } catch (err) {
                if (active) {
                    setError(err.message || 'Không thể tải tổng quan quản trị.')
                    setLoading(false)
                }
            }
        }
        init()
        return () => { active = false }
    }, [])

    const onLiveUpdate = useCallback(() => {
        refresh(true)
    }, [refresh])

    useSocketEvent('delivery:arrived', onLiveUpdate)
    useSocketEvent('iot:status', onLiveUpdate)
    useSocketEvent('iot:alert', onLiveUpdate)
    useSocketEvent('notification:new', onLiveUpdate)
    useSocketEvent('unlock:success', onLiveUpdate)
    useSocketEvent('unlock:failed', onLiveUpdate)

    if (loading) return <Loading label="Đang tải tổng quan hệ thống quản trị" />

    const users = summary?.users ?? []
    const vehicles = summary?.vehicles ?? []
    const deliveries = summary?.deliveries ?? []
    const devices = summary?.devices ?? []
    const reports = summary?.reports ?? []

    const userMap = new Map(users.map((u) => [u._id, u]))
    const vehicleMap = new Map(vehicles.map((v) => [v._id, v]))

    const activeUser = users.filter((u) => u.status === 'active').length
    const ownersCount = users.filter((u) => u.role === 'owner').length
    const shippersCount = users.filter((u) => u.role === 'shipper').length

    const activeVehicle = vehicles.filter((v) => v.status === 'active').length
    const linkedVehicle = vehicles.filter((v) => !!v.iotDeviceId).length

    const openDelivery = deliveries.filter((d) => !['completed', 'cancelled'].includes(d.status)).length
    const completedDelivery = deliveries.filter((d) => d.status === 'completed').length

    const onlineDevices = devices.filter((d) => d.status === 'online').length
    const lockedDevices = devices.filter((d) => d.lockStatus === 'locked').length
    const lowPinDevices = devices.filter((d) => d.battery != null && d.battery < 20).length

    const openReports = reports.filter((r) => r.status === 'open').length

    return (
        <AdminPage
            eyebrow="Vận hành hệ thống"
            title="Bảng điều khiển quản trị"
            description="Giám sát thời gian thực toàn bộ chuỗi giao hàng, thiết bị IoT khóa thông minh, đội xe và tài khoản."
            action={
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-300">
                        <span className={`inline-block size-2 rounded-full ${healthStatus?.success !== false ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-red-500'}`} />
                        {healthStatus?.success !== false ? 'API kết nối ổn định' : 'API gián đoạn'}
                    </span>
                    <button
                        className="ui-button-secondary gap-1.5 px-3.5 py-1.5 text-xs font-semibold"
                        disabled={refreshing}
                        onClick={() => refresh()}
                        type="button"
                    >
                        <RefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
                        {refreshing ? 'Đang cập nhật...' : 'Làm mới'}
                    </button>
                </div>
            }
        >
            {error && <ErrorMessage message={error} />}

            {/* Metric counters: Spatial 3D Bento */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" aria-label="Tóm tắt hệ thống">
                <AdminMetricCard
                    to="/admin/users"
                    label="Người dùng"
                    value={users.length}
                    detail={
                        <p className="truncate">
                            <span className="text-emerald-400 font-semibold">{activeUser}</span> hoạt động · {ownersCount} chủ xe
                        </p>
                    }
                    icon={Users}
                    tone="blue"
                />

                <AdminMetricCard
                    to="/admin/vehicles"
                    label="Phương tiện"
                    value={vehicles.length}
                    detail={
                        <p className="truncate">
                            <span className="text-cyan-400 font-semibold">{linkedVehicle}</span> gắn IoT · {activeVehicle} khả dụng
                        </p>
                    }
                    icon={CarFront}
                    tone="cyan"
                />

                <AdminMetricCard
                    to="/admin/deliveries"
                    label="Đơn giao hàng"
                    value={deliveries.length}
                    detail={
                        <p className="truncate">
                            <span className="text-blue-400 font-semibold">{openDelivery}</span> đang giao · {completedDelivery} hoàn tất
                        </p>
                    }
                    icon={Package}
                    tone="purple"
                />

                <AdminMetricCard
                    to="/admin/iot"
                    label="Khóa thông minh"
                    value={devices.length}
                    detail={
                        <p className="truncate">
                            <span className="text-emerald-400 font-semibold">{onlineDevices}</span> online · {lockedDevices} đã khóa
                        </p>
                    }
                    icon={LockKeyhole}
                    tone="emerald"
                />

                <AdminMetricCard
                    to="/admin/reports"
                    label="Báo cáo sự cố"
                    value={reports.length}
                    detail={
                        <p className="truncate">
                            <span className={openReports > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                                {openReports} chờ xử lý
                            </span>
                        </p>
                    }
                    icon={ClipboardList}
                    tone="amber"
                />

                <AdminMetricCard
                    to="/admin/feedbacks"
                    label="Đánh giá 5 sao"
                    value={`${feedbackStats?.averageRating ? feedbackStats.averageRating.toFixed(1) : '5.0'} ★`}
                    detail={
                        <p className="truncate">
                            <span className="text-amber-400 font-bold">{feedbackStats?.total || 0}</span> đánh giá · {feedbackStats?.pendingReplies || 0} chờ trả lời
                        </p>
                    }
                    icon={Star}
                    tone="yellow"
                />
            </section>

            {/* Giám sát giao hàng trực tiếp */}
            <Card
                title="Giám sát đơn giao hàng trực tiếp"
                description="Tiến độ lộ trình và trạng thái mở khóa IoT mới nhất"
                action={
                    <Link className="text-xs font-semibold text-cyan-400 no-underline hover:text-cyan-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" to="/admin/deliveries">
                        Xem tất cả đơn giao hàng →
                    </Link>
                }
            >
                {deliveries.length === 0 ? (
                    <EmptyState
                        title="Chưa có đơn giao hàng"
                        description="Hệ thống chưa ghi nhận đơn giao hàng nào được tạo."
                    />
                ) : (
                    <>
                        <div className="hidden md:block">
                            <Table className="min-w-[55rem]">
                                <thead className="border-b border-white/10 bg-white/[0.03] text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="px-5 py-3.5">Mã đơn</th>
                                        <th className="px-5 py-3.5">Chủ xe / Shipper</th>
                                        <th className="px-5 py-3.5">Phương tiện</th>
                                        <th className="px-5 py-3.5">Lộ trình</th>
                                        <th className="px-5 py-3.5">Trạng thái</th>
                                        <th className="px-5 py-3.5">Chốt khóa</th>
                                        <th className="px-5 py-3.5 text-right">Chi tiết</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {deliveries.slice(0, 6).map((item) => {
                                        const owner = userMap.get(item.ownerId)
                                        const shipper = userMap.get(item.shipperId)
                                        const vehicle = vehicleMap.get(item.vehicleId)

                                        return (
                                            <tr className="transition hover:bg-white/[0.04]" key={item._id}>
                                                <td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]">
                                                    {item._id ? item._id.slice(-8).toUpperCase() : '—'}
                                                </td>
                                                <td className="px-5 py-4 text-xs">
                                                    <p className="font-semibold text-white">{owner?.name || 'Không rõ chủ xe'}</p>
                                                    <p className="text-slate-400 text-[11px]">
                                                        {shipper ? `Shipper: ${shipper.name}` : 'Chưa phân công shipper'}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4 text-xs font-mono text-slate-300">
                                                    {vehicle?.plateNumber || (item.vehicleId ? item.vehicleId.slice(-6) : '—')}
                                                </td>
                                                <td className="max-w-xs px-5 py-4 text-xs text-slate-300">
                                                    <p className="truncate font-medium">{item.pickupAddress}</p>
                                                    <p className="truncate text-slate-400 text-[11px]">→ {item.deliveryAddress}</p>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <StatusPill value={item.status} />
                                                </td>
                                                <td className="px-5 py-4">
                                                    <StatusPill value={item.unlockStatus || 'pending'} />
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <Link
                                                        className="text-xs font-semibold text-cyan-400 no-underline hover:text-cyan-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                                                        to="/admin/deliveries"
                                                    >
                                                        Xem →
                                                    </Link>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </Table>
                        </div>

                        {/* Mobile view */}
                        <div className="grid gap-3 md:hidden">
                            {deliveries.slice(0, 4).map((item) => (
                                <div className="spatial-card p-4 space-y-2.5" key={item._id}>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs font-bold text-cyan-300">
                                            #{item._id ? item._id.slice(-8).toUpperCase() : ''}
                                        </span>
                                        <StatusPill value={item.status} />
                                    </div>
                                    <p className="text-xs text-slate-300 truncate">{item.pickupAddress} → {item.deliveryAddress}</p>
                                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5">
                                        <span>Khóa: <StatusPill value={item.unlockStatus || 'pending'} /></span>
                                        <Link className="font-semibold text-cyan-400" to="/admin/deliveries">Chi tiết</Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </Card>

            {/* Trạng thái thiết bị IoT và báo cáo sự cố gần đây */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Tổng quan thiết bị IoT */}
                <Card
                    title="Trạng thái đội khóa thông minh IoT"
                    description="Tín hiệu viễn thông trực tiếp từ phần cứng đã kết nối"
                    action={
                        <Link className="text-xs font-semibold text-cyan-400 no-underline hover:text-cyan-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" to="/admin/iot">
                            Quản lý khóa →
                        </Link>
                    }
                >
                    {devices.length === 0 ? (
                        <EmptyState
                            title="Chưa có thiết bị IoT"
                            description="Chưa có khóa thông minh nào được đăng ký trong hệ thống."
                        />
                    ) : (
                        <div className="divide-y divide-white/5">
                            {devices.slice(0, 5).map((device) => {
                                const vehicle = vehicleMap.get(device.vehicleId)
                                return (
                                    <div className="flex items-center justify-between py-3.5 text-sm first:pt-0 last:pb-0" key={device._id}>
                                        <div className="min-w-0 pr-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]">
                                                    {device.deviceId}
                                                </span>
                                                <StatusPill value={device.status} />
                                                <StatusPill value={device.lockStatus} />
                                            </div>
                                            <p className="mt-1 text-xs text-slate-400">
                                                Xe: <span className="text-slate-200 font-medium">{vehicle?.plateNumber || 'Chưa gắn xe'}</span>
                                                {device.battery != null && <span className="ml-2 font-mono text-emerald-400">· Pin: {device.battery}%</span>}
                                            </p>
                                        </div>
                                        <Link
                                            to={`/admin/iot/${device._id}`}
                                            className="ui-button-secondary shrink-0 px-3 py-1.5 text-xs font-semibold"
                                        >
                                            Chi tiết
                                        </Link>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </Card>

                {/* Báo cáo sự cố gần đây */}
                <Card
                    title="Cảnh báo sự cố gần đây"
                    description="Sự cố kỹ thuật & vận hành do nhân viên báo cáo"
                    action={
                        <Link className="text-xs font-semibold text-cyan-400 no-underline hover:text-cyan-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" to="/admin/reports">
                            Tất cả báo cáo →
                        </Link>
                    }
                >
                    {reports.length === 0 ? (
                        <EmptyState
                            title="Không có sự cố nào"
                            description="Tất cả các tuyến giao hàng và thiết bị đang vận hành ổn định."
                        />
                    ) : (
                        <div className="divide-y divide-white/5">
                            {reports.slice(0, 5).map((report) => (
                                <div className="py-3.5 text-sm first:pt-0 last:pb-0" key={report._id}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="inline-flex items-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                                            {report.category}
                                        </span>
                                        <span className="font-mono text-xs text-slate-400">
                                            {report.createdAt ? new Date(report.createdAt).toLocaleString('vi-VN') : '—'}
                                        </span>
                                    </div>
                                    <p className="mt-1.5 text-xs leading-relaxed text-slate-300 line-clamp-2">
                                        {report.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Đánh giá & Ý kiến khách hàng gần đây */}
            <Card
                title="Đánh giá & Ý kiến khách hàng gần đây"
                description="Tổng hợp đánh giá 5 sao từ shipper, chủ xe & khách hàng với hỗ trợ phản hồi chính thức"
                action={
                    <Link className="text-xs font-semibold text-cyan-400 no-underline hover:text-cyan-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" to="/admin/feedbacks">
                        Quản lý tất cả đánh giá ({feedbackStats.total || 0}) →
                    </Link>
                }
            >
                {recentFeedbacks.length === 0 ? (
                    <EmptyState
                        title="Chưa có đánh giá nào"
                        description="Hệ thống chưa ghi nhận lượt đánh giá hoặc feedback nào từ người dùng."
                    />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {recentFeedbacks.slice(0, 4).map((fb) => (
                            <div
                                key={fb._id}
                                className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-amber-400/30 hover:bg-white/[0.04]"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-1 mb-2">
                                        <div className="flex items-center gap-0.5">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star
                                                    key={s}
                                                    size={12}
                                                    className={s <= fb.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                            {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString('vi-VN') : '—'}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-white line-clamp-1">{fb.userName || 'Người dùng ẩn danh'}</p>
                                    <p className="mt-1 text-xs text-slate-300 line-clamp-2 leading-relaxed">
                                        "{fb.comment || 'Dịch vụ uy tín, an toàn.'}"
                                    </p>
                                </div>
                                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
                                    {fb.adminReply ? (
                                        <span className="text-emerald-400 font-semibold text-[10px]">✓ Đã phản hồi</span>
                                    ) : (
                                        <span className="text-amber-400 font-semibold text-[10px]">Chờ phản hồi</span>
                                    )}
                                    <Link
                                        to="/admin/feedbacks"
                                        className="text-cyan-400 hover:text-cyan-300 font-medium text-[11px]"
                                    >
                                        Chi tiết →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </AdminPage>
    )
}