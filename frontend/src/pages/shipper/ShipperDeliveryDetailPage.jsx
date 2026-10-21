import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
    ArrowLeft,
    CheckCircle2,
    Truck,
    MapPin,
    Lock,
    Unlock,
    KeyRound,
    AlertTriangle,
    RotateCw,
    ShieldAlert
} from 'lucide-react'
import { OwnerError, OwnerLoading, OwnerNotice } from '../../components/OwnerFeedback.jsx'
import ShipperPage from '../../components/ShipperPage.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import Card from '../../components/ui/Card.jsx'
import DeliveryTimeline from '../../components/delivery/DeliveryTimeline.jsx'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import { shipperDeliveryApi } from '../../services/ownerApi.js'

export default function ShipperDeliveryDetailPage() {
    const { id } = useParams()
    const [delivery, setDelivery] = useState(null)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [busy, setBusy] = useState(false)
    const actionBusyRef = useRef(false)

    const refresh = useCallback(async () => {
        setError('')
        try {
            const data = await shipperDeliveryApi.get(id)
            setDelivery(data)
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải chi tiết đơn giao hàng.')
        }
    }, [id])

    useEffect(() => {
        let active = true
        async function fetchInitial() {
            try {
                const data = await shipperDeliveryApi.get(id)
                if (active) setDelivery(data)
            } catch (err) {
                if (active) setError(err.message || 'Lỗi kết nối máy chủ')
            }
        }
        fetchInitial()
        return () => {
            active = false
        }
    }, [id])

    const onDeliveryEvent = useCallback((event) => {
        if (!event?.deliveryId || event.deliveryId === id) refresh()
    }, [id, refresh])

    const onUnlockCodeIssued = useCallback((event) => {
        if (event?.deliveryId !== id) return
        setNotice('Mã mở khóa mới đã được cấp. Hãy vào màn hình mở khóa để thực hiện.')
        refresh()
    }, [id, refresh])

    useSocketEvent('delivery:authorized', onDeliveryEvent)
    useSocketEvent('unlock:requested', onDeliveryEvent)
    useSocketEvent('unlock:success', onDeliveryEvent)
    useSocketEvent('unlock:failed', onDeliveryEvent)
    useSocketEvent('iot:status', onDeliveryEvent)
    useSocketEvent('unlock-code:created', onUnlockCodeIssued)

    async function runAction(action, successMessage) {
        if (actionBusyRef.current) return
        actionBusyRef.current = true
        setBusy(true)
        setError('')
        setNotice('')
        try {
            await action(id)
            setNotice(successMessage)
            await refresh()
        } catch (requestError) {
            setError(requestError.message || 'Thao tác không thành công.')
        } finally {
            actionBusyRef.current = false
            setBusy(false)
        }
    }

    if (!delivery && !error) return <OwnerLoading label="Đang tải thông tin đơn giao hàng..." />

    const canComplete = delivery?.status === 'authorized' && delivery.unlockStatus === 'succeeded'
    const actions = []

    if (delivery?.status === 'assigned') {
        actions.push(
            <button
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-50"
                disabled={busy}
                key="accept"
                onClick={() => runAction(shipperDeliveryApi.accept, 'Đã tiếp nhận đơn giao hàng.')}
                type="button"
            >
                <Truck className="h-4 w-4" />
                {busy ? 'Đang xử lý…' : 'Tiếp nhận đơn giao hàng'}
            </button>
        )
    }

    if (delivery?.status === 'accepted') {
        actions.push(
            <button
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-50"
                disabled={busy}
                key="start"
                onClick={() => runAction(shipperDeliveryApi.start, 'Đã bắt đầu hành trình giao hàng.')}
                type="button"
            >
                <Truck className="h-4 w-4" />
                {busy ? 'Đang xử lý…' : 'Bắt đầu di chuyển'}
            </button>
        )
    }

    if (delivery?.status === 'in-progress') {
        actions.push(
            <Link
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg transition active:scale-95"
                key="arrive"
                to={`/shipper/deliveries/${id}/arrive`}
            >
                <MapPin className="h-4 w-4" />
                Đã đến điểm giao
            </Link>
        )
    }

    if (delivery?.status === 'authorized' && delivery.unlockStatus !== 'succeeded') {
        actions.push(
            <Link
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-950/40 transition active:scale-95"
                key="unlock"
                to={`/shipper/deliveries/${id}/unlock`}
            >
                <KeyRound className="h-4 w-4" />
                Nhập mã OTP mở khóa
            </Link>
        )
    }

    if (canComplete) {
        actions.push(
            <button
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-950/40 transition active:scale-95 disabled:opacity-50"
                disabled={busy}
                key="complete"
                onClick={() => runAction(shipperDeliveryApi.complete, 'Đã hoàn tất đơn giao hàng thành công.')}
                type="button"
            >
                <CheckCircle2 className="h-4 w-4" />
                {busy ? 'Đang hoàn tất…' : 'Hoàn tất giao hàng'}
            </button>
        )
    }

    return (
        <ShipperPage
            eyebrow="Chi tiết hành trình"
            title={`Đơn giao hàng #${id?.slice(-6).toUpperCase() || ''}`}
            description="Quy trình giao hàng bảo mật IoT: Nhận đơn → Bắt đầu → Đến nơi → Cấp quyền mở khóa → Hoàn tất."
        >
            <Link
                className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
                to="/shipper/deliveries"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Quay lại danh sách đơn
            </Link>

            <OwnerError error={error} onRetry={refresh} />
            {notice && <OwnerNotice>{notice}</OwnerNotice>}

            {delivery && (
                <div className="space-y-6">
                    {/* Action Bar if actions available */}
                    {actions.length > 0 && (
                        <Card className="p-4 border-cyan-500/30 bg-cyan-500/10 backdrop-blur-xl">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Hành động tiếp theo</p>
                                    <p className="text-xs text-slate-300 mt-0.5">Tiến hành các bước theo quy trình vận hành</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    {actions}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Delivery Information Card */}
                    <Card
                        title="Thông tin hành trình"
                        description="Chi tiết địa điểm lấy hàng, giao hàng và trạng thái kiểm soát thùng hàng"
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Điểm lấy hàng</p>
                                <p className="mt-1.5 text-sm font-semibold text-white">{delivery.pickupAddress}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Điểm đến</p>
                                <p className="mt-1.5 text-sm font-semibold text-white">{delivery.deliveryAddress}</p>
                            </div>
                            {delivery.description && (
                                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 sm:col-span-2">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ghi chú hàng hóa</p>
                                    <p className="mt-1.5 text-xs text-slate-300">{delivery.description}</p>
                                </div>
                            )}
                            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-4">
                                <span className="text-xs font-semibold text-slate-400">Trạng thái đơn:</span>
                                <StatusPill value={delivery.status} />
                            </div>
                            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-4">
                                <span className="text-xs font-semibold text-slate-400">Chốt khóa IoT:</span>
                                <StatusPill value={delivery.unlockStatus || 'pending'} />
                            </div>
                        </div>
                    </Card>

                    {/* Timeline */}
                    <Card title="Tiến trình giao hàng" description="Theo dõi thời gian thực từng bước chuyển trạng thái">
                        <DeliveryTimeline delivery={delivery} />
                    </Card>

                    {/* Report Issue Button */}
                    {!['completed', 'cancelled'].includes(delivery.status) && (
                        <div className="flex justify-end pt-2">
                            <Link
                                className="inline-flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 hover:border-red-500/40 transition"
                                state={{ deliveryId: id }}
                                to="/shipper/reports"
                            >
                                <AlertTriangle className="h-4 w-4" />
                                Báo cáo sự cố đơn hàng này
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </ShipperPage>
    )
}