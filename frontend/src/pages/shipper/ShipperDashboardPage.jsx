import { useCallback, useEffect, useState } from 'react'
import { Activity, CheckCircle2, Clock3, Package, ArrowRight, ShieldCheck, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { OwnerError, OwnerLoading } from '../../components/OwnerFeedback.jsx'
import ShipperPage from '../../components/ShipperPage.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import Card from '../../components/ui/Card.jsx'
import DeliveryCard from '../../components/delivery/DeliveryCard.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import { useAuth } from '../../context/useAuth.js'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import { shipperDeliveryApi } from '../../services/ownerApi.js'

const metricsConfig = [
    { label: 'Được giao cho tôi', icon: Package, tone: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' },
    { label: 'Đang hoạt động', icon: Activity, tone: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
    { label: 'Chờ mở khóa / Cần xử lý', icon: Clock3, tone: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
    { label: 'Đã hoàn tất', icon: CheckCircle2, tone: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
]

export default function ShipperDashboardPage() {
    const { user } = useAuth()
    const [deliveries, setDelivery] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const refresh = useCallback(async () => {
        setError('')
        try {
            const data = await shipperDeliveryApi.list()
            setDelivery(Array.isArray(data) ? data : [])
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải đơn hàng')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        let active = true
        async function fetchInitial() {
            try {
                const data = await shipperDeliveryApi.list()
                if (active) setDelivery(Array.isArray(data) ? data : [])
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

    const onDeliveryEvent = useCallback((event) => {
        if (!event?.deliveryId || deliveries.some((delivery) => delivery._id === event.deliveryId)) {
            refresh()
        }
    }, [deliveries, refresh])

    useSocketEvent('delivery:authorized', onDeliveryEvent)
    useSocketEvent('unlock-code:created', onDeliveryEvent)
    useSocketEvent('unlock:requested', onDeliveryEvent)
    useSocketEvent('unlock:success', onDeliveryEvent)
    useSocketEvent('unlock:failed', onDeliveryEvent)

    const active = deliveries.filter((d) => !['completed', 'cancelled'].includes(d.status))
    const waiting = active.filter((d) => ['assigned', 'authorized'].includes(d.status))
    const completed = deliveries.filter((d) => d.status === 'completed')
    const values = [deliveries.length, active.length, waiting.length, completed.length]

    return (
        <ShipperPage
            eyebrow="Không gian nhân viên giao hàng"
            title={`Xin chào, ${user?.name || 'Nhân viên giao hàng'}`}
            description="Bảng điều khiển trực quan các đơn hàng được bàn giao, quản lý trạng thái khóa IoT và lịch sử chuyến đi."
        >
            <OwnerError error={error} onRetry={refresh} />
            {loading ? (
                <OwnerLoading label="Đang tải các chuyến giao hàng..." />
            ) : (
                <div className="space-y-6">
                    {/* Bento Metrics */}
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Tóm tắt giao hàng">
                        {metricsConfig.map((item, index) => {
                            const Icon = item.icon
                            return (
                                <Card
                                    className="p-4 border-white/10 bg-slate-900/40 hover:-translate-y-0.5 transition duration-200"
                                    key={item.label}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400">{item.label}</p>
                                            <p className="mt-2 text-3xl font-black tabular-nums text-white">
                                                {values[index]}
                                            </p>
                                        </div>
                                        <span className={`grid h-11 w-11 place-items-center rounded-xl ${item.tone}`}>
                                            <Icon aria-hidden="true" size={20} />
                                        </span>
                                    </div>
                                </Card>
                            )
                        })}
                    </section>

                    {/* Active Deliveries */}
                    <Card
                        title="Đơn giao hàng đang thực hiện"
                        description="Các đơn hàng cần bạn tiếp nhận, di chuyển hoặc mở khóa thùng IoT"
                        action={
                            <Link
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
                                to="/shipper/deliveries"
                            >
                                Xem tất cả ({active.length})
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        }
                    >
                        {active.length === 0 ? (
                            <EmptyState
                                title="Không có đơn giao hàng đang hoạt động"
                                description="Các đơn hàng mới được chủ đội xe phân công sẽ hiển thị ngay tại đây."
                            />
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {active.slice(0, 6).map((delivery) => (
                                    <DeliveryCard
                                        delivery={delivery}
                                        key={delivery._id}
                                        to={`/shipper/deliveries/${delivery._id}`}
                                    />
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Recently Completed */}
                    {completed.length > 0 && (
                        <Card
                            title="Hoàn tất gần đây"
                            description="Nhật ký các chuyến giao hàng thành công"
                            action={
                                <Link
                                    className="text-xs font-semibold text-slate-400 hover:text-white transition"
                                    to="/shipper/history"
                                >
                                    Xem toàn bộ lịch sử
                                </Link>
                            }
                        >
                            <ul className="divide-y divide-white/5">
                                {completed.slice(0, 4).map((delivery) => (
                                    <li
                                        className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                                        key={delivery._id}
                                    >
                                        <div className="min-w-0">
                                            <Link
                                                className="font-mono text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline"
                                                to={`/shipper/deliveries/${delivery._id}`}
                                            >
                                                #{delivery._id.slice(-8).toUpperCase()}
                                            </Link>
                                            <p className="mt-1 truncate text-xs text-slate-300">
                                                {delivery.pickupAddress} → {delivery.deliveryAddress}
                                            </p>
                                        </div>
                                        <StatusPill value={delivery.status} />
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                </div>
            )}
        </ShipperPage>
    )
}
