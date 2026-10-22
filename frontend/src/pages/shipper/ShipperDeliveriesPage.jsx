import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    MapPin,
    Navigation,
    Zap,
    Package,
    Clock,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    ArrowRight,
    ShieldCheck,
    Truck,
    Info,
    Sparkles
} from 'lucide-react'
import { OwnerError, OwnerLoading } from '../../components/OwnerFeedback.jsx'
import ShipperPage from '../../components/ShipperPage.jsx'
import DeliveryList from '../../components/delivery/DeliveryList.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import { shipperDeliveryApi } from '../../services/ownerApi.js'
import { formatTimeRelative } from '../../utils/activityLogFormatter.js'

// Haversine Formula: Great-circle distance between two points on Earth (in km)
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null
    const R = 6371 // Bán kính Trái Đất (km)
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c
    return Math.round(d * 10) / 10 // Làm tròn 1 chữ số thập phân
}

function formatDistanceBadge(km) {
    if (km == null) return '📍 Đang tính khoảng cách...'
    if (km < 1) {
        return `📍 Cách bạn ${Math.round(km * 1000)} m`
    }
    return `📍 Cách bạn ${km} km`
}

export default function ShipperDeliveryPage() {
    const [activeTab, setActiveTab] = useState('available') // 'available' | 'my-orders'
    const [availableDeliveries, setAvailableDeliveries] = useState([])
    const [myDeliveries, setMyDeliveries] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [claimingId, setClaimingId] = useState(null)
    const [conflictNotice, setConflictNotice] = useState(null) // { open: boolean, message: string }
    const [successNotice, setSuccessNotice] = useState('')

    // Vị trí GPS hiện tại của Shipper (Mặc định trung tâm Cần Thơ)
    const [shipperLocation, setShipperLocation] = useState({
        lat: 10.0336,
        lng: 105.7836,
        address: 'Ninh Kiều, Cần Thơ',
        detecting: false,
    })

    // Lấy tọa độ GPS thiết bị thực tế
    const detectCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) return
        setShipperLocation((prev) => ({ ...prev, detecting: true }))
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setShipperLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    address: 'Tọa độ GPS hiện tại',
                    detecting: false,
                })
            },
            () => {
                // Giữ vị trí mặc định nếu người dùng từ chối quyền GPS
                setShipperLocation((prev) => ({ ...prev, detecting: false }))
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }, [])

    useEffect(() => {
        detectCurrentLocation()
    }, [detectCurrentLocation])

    // Tải dữ liệu ban đầu
    const refreshData = useCallback(async () => {
        setError('')
        try {
            const [mine, available] = await Promise.all([
                shipperDeliveryApi.list().catch(() => []),
                shipperDeliveryApi.listAvailable().catch(() => []),
            ])
            setMyDeliveries(mine)
            setAvailableDeliveries(available)
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải danh sách đơn hàng.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refreshData()
    }, [refreshData])

    // Socket.IO: Khi có Shipper khác nhận đơn thành công -> xóa ngay khỏi danh sách chờ của tôi
    const onDeliveryClaimed = useCallback((event) => {
        if (!event?.deliveryId) return
        setAvailableDeliveries((prev) => prev.filter((d) => d._id !== event.deliveryId))
    }, [])

    // Socket.IO: Khi Owner tạo đơn mới -> tự động thêm vào danh sách đơn chờ nhận
    const onDeliveryCreated = useCallback((event) => {
        if (!event?.delivery) return
        setAvailableDeliveries((prev) => {
            if (prev.some((d) => d._id === event.delivery._id)) return prev
            return [event.delivery, ...prev]
        })
    }, [])

    // Socket.IO: Khi đơn hàng của tôi thay đổi trạng thái
    const onMyDeliveryEvent = useCallback((event) => {
        if (!event?.deliveryId) return
        refreshData()
    }, [refreshData])

    useSocketEvent('delivery:claimed', onDeliveryClaimed)
    useSocketEvent('delivery:created', onDeliveryCreated)
    useSocketEvent('delivery:authorized', onMyDeliveryEvent)
    useSocketEvent('unlock-code:created', onMyDeliveryEvent)
    useSocketEvent('unlock:requested', onMyDeliveryEvent)
    useSocketEvent('unlock:success', onMyDeliveryEvent)
    useSocketEvent('unlock:failed', onMyDeliveryEvent)

    // Xử lý cơ chế độc quyền nhận đơn (Exclusive Claiming)
    async function handleClaimOrder(order) {
        setClaimingId(order._id)
        setSuccessNotice('')
        setError('')

        try {
            const accepted = await shipperDeliveryApi.accept(order._id)
            // Thành công: Xóa khỏi danh sách chờ nhận, thêm vào đơn của tôi
            setAvailableDeliveries((prev) => prev.filter((d) => d._id !== order._id))
            setMyDeliveries((prev) => [accepted, ...prev])
            setSuccessNotice(`🎉 Bạn đã nhận đơn hàng #LS-${String(order._id).slice(-4).toUpperCase()} thành công!`)
            setTimeout(() => setSuccessNotice(''), 6000)
        } catch (err) {
            // Trường hợp bị tài xế khác nhận trước (409 Conflict)
            if (err.statusCode === 409 || err.message?.includes('khác nhận') || err.message?.includes('conflict')) {
                setConflictNotice({
                    open: true,
                    message: err.message || 'Đơn hàng này vừa có tài xế khác nhận mất rồi!',
                })
                // Xóa khỏi danh sách chờ của mình để không hiển thị đơn đã mất
                setAvailableDeliveries((prev) => prev.filter((d) => d._id !== order._id))
            } else {
                setError(err.message || 'Không thể nhận đơn hàng này.')
            }
        } finally {
            setClaimingId(null)
        }
    }

    // Sắp xếp đơn chờ nhận theo khoảng cách từ vị trí Shipper đến Điểm lấy hàng (Gần -> Xa)
    const sortedAvailableDeliveries = useMemo(() => {
        return [...availableDeliveries].map((delivery) => {
            // Lấy tọa độ điểm lấy hàng (từ model hoặc fallback)
            const pickupLat = delivery.pickupLocation?.lat || 10.0360
            const pickupLng = delivery.pickupLocation?.lng || 105.7818
            const distance = calculateHaversineDistance(
                shipperLocation.lat,
                shipperLocation.lng,
                pickupLat,
                pickupLng
            )
            return {
                ...delivery,
                distanceKm: distance ?? 999,
            }
        }).sort((a, b) => a.distanceKm - b.distanceKm)
    }, [availableDeliveries, shipperLocation])

    return (
        <ShipperPage
            eyebrow="Không gian làm việc của Shipper"
            title="Sàn Nhận Đơn Hàng & Điều Phối"
            description="Tìm kiếm đơn hàng theo khoảng cách thực tế, nhận đơn độc quyền và quản lý tiến độ giao hàng thông minh."
            action={
                <button
                    onClick={refreshData}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
                    type="button"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Làm mới
                </button>
            }
        >
            <OwnerError error={error} onRetry={refreshData} />

            {/* Success Banner */}
            {successNotice && (
                <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-emerald-300 flex items-center justify-between shadow-lg shadow-emerald-950/50 animate-in fade-in">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                        <span className="text-sm font-semibold">{successNotice}</span>
                    </div>
                    <button
                        onClick={() => setActiveTab('my-orders')}
                        className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                        type="button"
                    >
                        Xem trong "Đơn của tôi" →
                    </button>
                </div>
            )}

            {/* GPS Location Bar */}
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                        <Navigation className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Vị trí hiện tại của bạn:</p>
                        <p className="text-sm font-bold text-white flex items-center gap-1.5">
                            {shipperLocation.address}
                            <span className="font-mono text-xs text-cyan-300/80">
                                ({shipperLocation.lat.toFixed(4)}, {shipperLocation.lng.toFixed(4)})
                            </span>
                        </p>
                    </div>
                </div>
                <button
                    onClick={detectCurrentLocation}
                    disabled={shipperLocation.detecting}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition disabled:opacity-50"
                    type="button"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${shipperLocation.detecting ? 'animate-spin' : ''}`} />
                    {shipperLocation.detecting ? 'Đang xác định GPS...' : 'Cập nhật lại GPS'}
                </button>
            </div>

            {/* 2 Primary Tabs: Available (Grab-style) vs My Orders */}
            <div className="mb-6 flex items-center gap-2 border-b border-white/10 pb-3">
                <button
                    onClick={() => setActiveTab('available')}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                        activeTab === 'available'
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-950/40'
                            : 'border border-white/5 bg-white/[0.03] text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                    type="button"
                >
                    <Zap className="h-4 w-4" />
                    <span>⚡ Đơn chờ nhận (Gần bạn nhất)</span>
                    <span className="rounded-full bg-slate-950/40 px-2 py-0.5 text-[11px] font-mono text-cyan-200">
                        {sortedAvailableDeliveries.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('my-orders')}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                        activeTab === 'my-orders'
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-950/40'
                            : 'border border-white/5 bg-white/[0.03] text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                    type="button"
                >
                    <Package className="h-4 w-4" />
                    <span>📦 Đơn của tôi</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-mono text-slate-200">
                        {myDeliveries.length}
                    </span>
                </button>
            </div>

            {/* Tab 1: Available Orders (Grab style distance matching) */}
            {activeTab === 'available' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>
                            Sắp xếp tự động: <strong>Từ gần đến xa theo công thức Haversine</strong>
                        </span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                            Đồng bộ thời gian thực qua Socket.IO
                        </span>
                    </div>

                    {loading ? (
                        <OwnerLoading label="Đang quét các đơn hàng xung quanh bạn..." />
                    ) : sortedAvailableDeliveries.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/30 p-12 text-center">
                            <Package className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                            <h3 className="text-base font-bold text-slate-300">Hiện không có đơn hàng nào chờ nhận</h3>
                            <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto">
                                Khi có chủ hàng tạo đơn mới, hệ thống sẽ tự động cập nhật và hiển thị ngay tại đây theo thời gian thực mà không cần tải lại trang.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {sortedAvailableDeliveries.map((order) => {
                                const isClaiming = claimingId === order._id
                                const shortCode = `#LS-${String(order._id).slice(-4).toUpperCase()}`

                                return (
                                    <div
                                        key={order._id}
                                        className="relative rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl transition hover:border-cyan-500/40 hover:bg-slate-900/80 shadow-xl flex flex-col justify-between group"
                                    >
                                        <div>
                                            {/* Header with Distance Badge */}
                                            <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/5">
                                                <div>
                                                    <span className="font-mono text-sm font-extrabold text-cyan-300 tracking-wider">
                                                        {shortCode}
                                                    </span>
                                                    <span className="ml-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                                                        Chờ tài xế
                                                    </span>
                                                </div>

                                                {/* Distance Badge */}
                                                <div className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                                                    {formatDistanceBadge(order.distanceKm)}
                                                </div>
                                            </div>

                                            {/* Route: Pickup & Destination */}
                                            <div className="mt-4 space-y-3 text-xs">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 shrink-0 mt-0.5">
                                                        <MapPin className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase font-bold text-slate-400">Điểm lấy hàng:</p>
                                                        <p className="font-medium text-slate-100 leading-snug">
                                                            {order.pickupAddress}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-2.5">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5">
                                                        <Package className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase font-bold text-slate-400">Điểm giao hàng (Tủ Lockship):</p>
                                                        <p className="font-medium text-slate-100 leading-snug">
                                                            {order.deliveryAddress}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Description / Metadata notes */}
                                            {order.description && (
                                                <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-[11px] text-slate-300 line-clamp-2">
                                                    {order.description}
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer: Created time + Exclusive Claim Button */}
                                        <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3">
                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                                <Clock className="h-3.5 w-3.5 text-slate-500" />
                                                <span>{formatTimeRelative(order.createdAt)}</span>
                                            </div>

                                            <button
                                                onClick={() => handleClaimOrder(order)}
                                                disabled={isClaiming}
                                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-slate-950 hover:brightness-110 active:scale-95 transition disabled:opacity-50 shadow-lg shadow-cyan-950/50"
                                                type="button"
                                            >
                                                {isClaiming ? (
                                                    <>
                                                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                        Đang giữ đơn...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap className="h-3.5 w-3.5" />
                                                        Nhận đơn ngay
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: My Deliveries (Already Accepted / Assigned) */}
            {activeTab === 'my-orders' && (
                <div>
                    <DeliveryList
                        deliveries={myDeliveries}
                        loading={loading}
                        role="shipper"
                        statusOptions={[
                            'active',
                            'all',
                            'assigned',
                            'accepted',
                            'in-progress',
                            'arrived',
                            'authorized',
                            'completed',
                            'cancelled',
                        ]}
                    />
                </div>
            )}

            {/* Modal: 409 Conflict when another Shipper claims first */}
            <Modal
                title="Đơn hàng đã được nhận"
                open={conflictNotice?.open}
                onClose={() => setConflictNotice(null)}
                description={conflictNotice?.message || 'Đơn hàng này vừa có tài xế khác nhận mất rồi! Vui lòng chọn đơn hàng khác.'}
                footer={
                    <Button
                        onClick={() => setConflictNotice(null)}
                        type="button"
                        variant="primary"
                    >
                        Đã hiểu & Tiếp tục
                    </Button>
                }
            />
        </ShipperPage>
    )
}