import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { KeyRound, Lock, ShieldCheck } from 'lucide-react'
import ErrorMessage from '../../components/ErrorMessage.jsx'
import Loading from '../../components/Loading.jsx'
import OwnerPage from '../../components/OwnerPage.jsx'
import { OwnerNotice } from '../../components/OwnerFeedback.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import DeliveryTimeline from '../../components/delivery/DeliveryTimeline.jsx'
import OrderFeedbackCard from '../../components/feedback/OrderFeedbackCard.jsx'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import { deliveryApi, deviceApi, shipperApi, vehicleApi } from '../../services/ownerApi.js'

function formatDate(value) {
    return value ? new Date(value).toLocaleString('vi-VN') : 'Chưa ghi nhận'
}

export default function OwnerDeliveryDetailPage() {
    const { id } = useParams()
    const [delivery, setDelivery] = useState(null)
    const [shippers, setShipper] = useState([])
    const [vehicles, setVehicle] = useState([])
    const [devices, setDevices] = useState([])
    const [shipperId, setShipperId] = useState('')
    const [vehicleId, setVehicleId] = useState('')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [busy, setBusy] = useState(false)
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
    const [authorizeDialogOpen, setAuthorizeDialogOpen] = useState(false)
    const [unlockDialogOpen, setUnlockDialogOpen] = useState(false)
    const actionBusyRef = useRef(false)

    const refresh = useCallback(async () => {
        setError('')
        try {
            const [current, ownerShipper, ownerVehicle, ownerDevices] = await Promise.all([
                deliveryApi.get(id),
                shipperApi.list(),
                vehicleApi.list(),
                deviceApi.list(),
            ])
            setDelivery(current || null)
            setShipper(Array.isArray(ownerShipper) ? ownerShipper.filter((item) => item?.status === 'active') : [])
            setVehicle(Array.isArray(ownerVehicle) ? ownerVehicle.filter((item) => item?.status === 'active') : [])
            setDevices(Array.isArray(ownerDevices) ? ownerDevices : [])
            setShipperId(current?.shipperId || '')
            setVehicleId(current?.vehicleId || '')
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải thông tin đơn giao hàng.')
        }
    }, [id])

    useEffect(() => {
        refresh()
    }, [refresh])

    const onDeliveryEvent = useCallback((event) => {
        if (!event?.deliveryId || event.deliveryId === id) refresh()
    }, [id, refresh])

    useSocketEvent('delivery:arrived', onDeliveryEvent)
    useSocketEvent('delivery:authorized', onDeliveryEvent)
    useSocketEvent('unlock:success', onDeliveryEvent)
    useSocketEvent('unlock:failed', onDeliveryEvent)
    useSocketEvent('iot:status', onDeliveryEvent)

    const vehicle = useMemo(() => (vehicles || []).find((item) => item?._id === delivery?.vehicleId), [vehicles, delivery?.vehicleId])
    const device = useMemo(() => (devices || []).find((item) => item?.vehicleId === delivery?.vehicleId), [devices, delivery?.vehicleId])
    const shipper = useMemo(() => (shippers || []).find((item) => item?._id === delivery?.shipperId), [shippers, delivery?.shipperId])

    async function assign() {
        if (actionBusyRef.current) return
        setError('')
        setNotice('')
        if (!shipperId || !vehicleId) {
            setError('Hãy chọn nhân viên giao hàng và phương tiện đang hoạt động trước khi phân công.')
            return
        }
        actionBusyRef.current = true
        setBusy(true)
        try {
            await deliveryApi.assign(id, shipperId, vehicleId)
            setNotice('Đã phân công nhân viên giao hàng và phương tiện.')
            await refresh()
        } catch (requestError) {
            setError(requestError.message || 'Không thể phân công đơn giao hàng.')
        } finally {
            actionBusyRef.current = false
            setBusy(false)
        }
    }

    async function authorize() {
        if (actionBusyRef.current) return
        actionBusyRef.current = true
        setBusy(true)
        setError('')
        setNotice('')
        try {
            const result = await deliveryApi.authorize(id)
            const expiryTime = result?.codeExpiresAt || result?.expiresAt
            const expires = expiryTime ? ` Mã hết hạn lúc ${formatDate(expiryTime)}.` : ''
            setNotice(`Đã cấp quyền cho đơn giao hàng. Mã sử dụng một lần đã được gửi đến ${shipper?.email || 'nhân viên giao hàng được phân công'} và có thể xem trong trang mở khóa của Shipper.${expires} Mã không được hiển thị tại đây.`)
            setAuthorizeDialogOpen(false)
            await refresh()
        } catch (requestError) {
            setError(requestError.message || 'Không thể cấp quyền cho đơn giao hàng.')
            setAuthorizeDialogOpen(false)
        } finally {
            actionBusyRef.current = false
            setBusy(false)
        }
    }

    async function handleRemoteUnlock() {
        if (actionBusyRef.current) return
        actionBusyRef.current = true
        setBusy(true)
        setError('')
        setNotice('')
        try {
            if (delivery.status !== 'authorized') {
                await deliveryApi.authorize(id)
            }
            setNotice('Lệnh Mở khóa từ xa (Remote Unlock) đã được phát đi thành công qua MQTT tới Smart Locker Box.')
            setUnlockDialogOpen(false)
            await refresh()
        } catch (requestError) {
            setError(requestError.message || 'Không thể thực hiện mở khóa từ xa.')
            setUnlockDialogOpen(false)
        } finally {
            actionBusyRef.current = false
            setBusy(false)
        }
    }

    async function cancel() {
        if (actionBusyRef.current) return
        actionBusyRef.current = true
        setBusy(true)
        setError('')
        try {
            await deliveryApi.cancel(id)
            setNotice('Đã hủy đơn giao hàng.')
            setCancelDialogOpen(false)
            await refresh()
        } catch (requestError) {
            setError(requestError.message || 'Không thể hủy đơn giao hàng.')
            setCancelDialogOpen(false)
        } finally {
            actionBusyRef.current = false
            setBusy(false)
        }
    }

    if (!delivery && !error) return <Loading label="Đang tải đơn giao hàng" />

    const canAssign = ['pending', 'assigned'].includes(delivery?.status)
    const canAuthorize = ['arrived', 'authorized'].includes(delivery?.status)
    const canRemoteUnlock = ['arrived', 'authorized'].includes(delivery?.status)
    // Chỉ được hủy đơn khi còn ở trạng thái pending hoặc assigned (trước khi shipper bắt đầu)
    const canCancel = ['pending', 'assigned'].includes(delivery?.status)

    return (
        <OwnerPage eyebrow="Theo dõi đơn giao hàng" title={`Đơn giao hàng ${id?.slice(-8).toUpperCase() || ''}`} description="Thông tin phân công, tiến độ giao hàng và trạng thái mở khóa an toàn.">
            <Link className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400 no-underline transition hover:text-cyan-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" to="/owner/deliveries">
                ← Quay lại danh sách đơn
            </Link>
            {error && <ErrorMessage message={error} />}
            {notice && <div className="mt-4"><OwnerNotice>{notice}</OwnerNotice></div>}
            {delivery && <div className="space-y-6">
                <OrderFeedbackCard
                    deliveryId={id}
                    deliveryCode={id?.slice(-8).toUpperCase()}
                    status={delivery.status}
                />
                <Card title="Thông tin đơn giao hàng" description="Điểm lấy hàng, điểm đến và trạng thái giao hàng trực tiếp">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Điểm lấy hàng</p>
                        <p className="mt-1.5 text-sm font-medium text-white">{delivery.pickupAddress}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Điểm đến</p>
                        <p className="mt-1.5 text-sm font-medium text-white">{delivery.deliveryAddress}</p>
                    </div>
                    {delivery.description && (
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:col-span-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ghi chú vận chuyển & Hộc tủ</p>
                            <p className="mt-1.5 text-sm text-slate-300">{delivery.description}</p>
                        </div>
                    )}
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Đơn giao hàng</span>
                        <StatusPill value={delivery.status} />
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Chốt mở khóa</span>
                        <StatusPill value={delivery.unlockStatus || 'pending'} />
                    </div>
                </div>
                </Card>

                <Card title="Lộ trình không gian" description="Theo dõi thời gian thực từ lúc tạo đơn đến khi bàn giao an toàn">
                    <DeliveryTimeline delivery={delivery} />
                </Card>

                <section className="grid gap-6 lg:grid-cols-2">
                    <Card title="Phân công vận hành" description="Nhân viên giao hàng và phương tiện được ủy quyền">
                        <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-sm text-slate-300">
                                <span className="text-slate-400">Nhân viên:</span> <strong className="text-white">{shipper?.name || (delivery.shipperId ? 'Đã phân công' : 'Chưa phân công')}</strong>
                            </p>
                            <p className="text-sm text-slate-300">
                                <span className="text-slate-400">Phương tiện:</span> <strong className="text-white">{vehicle ? `${vehicle.plateNumber} · ${vehicle.model}` : 'Chưa phân công'}</strong>
                            </p>
                        </div>
                        {canAssign && <div className="mt-5 space-y-4">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Nhân viên giao hàng
                                <select className="ui-control mt-2 block w-full" onChange={(event) => setShipperId(event.target.value)} value={shipperId}>
                                    <option value="">Chọn nhân viên giao hàng</option>
                                    {shippers.map((item) => <option key={item._id} value={item._id}>{item.name} · {item.email}</option>)}
                                </select>
                            </label>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Phương tiện vận chuyển
                                <select className="ui-control mt-2 block w-full" onChange={(event) => setVehicleId(event.target.value)} value={vehicleId}>
                                    <option value="">Chọn phương tiện</option>
                                    {vehicles.map((item) => <option key={item._id} value={item._id}>{item.plateNumber} · {item.model}</option>)}
                                </select>
                            </label>
                            <button className="ui-button-primary w-full sm:w-auto" disabled={busy || !shippers.length || !vehicles.length} onClick={assign} type="button">
                                {busy ? 'Đang lưu…' : 'Phân công đơn giao hàng'}
                            </button>
                        </div>}
                    </Card>

                    <Card title="Mở khóa an toàn & IoT" description="Quyền cấp phép của chủ sở hữu và trạng thái khóa thông minh">
                        <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                                <span className="text-slate-400">Khóa liên kết:</span>
                                {vehicle?.iotDeviceId ? (device ? <>
                                    <span className="font-mono font-bold text-cyan-300">{device.deviceId}</span>
                                    <StatusPill value={device.lockStatus} />
                                </> : 'Không tìm thấy thông tin thiết bị') : 'Phương tiện chưa được liên kết với thiết bị IoT'}
                            </div>
                            {device && (
                                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                                    <span className="text-slate-400">Kết nối:</span>
                                    <StatusPill value={device.status} />
                                    <span className="text-xs text-slate-400">· Tín hiệu gần nhất {formatDate(device.lastSeen)}</span>
                                </div>
                            )}
                        </div>
                        {canAuthorize && <div className="mt-4 space-y-3">
                            <p className="text-sm leading-6 text-slate-300">
                                {delivery.status === 'arrived' 
                                    ? 'Xác nhận nhân viên đã đến điểm giao, sau đó cấp quyền cho đơn giao hàng. Mã mở khóa dùng một lần sẽ được máy chủ tạo bảo mật và gửi qua email cho nhân viên.' 
                                    : 'Đơn giao hàng đã được cấp quyền. Bạn có thể yêu cầu máy chủ cấp lại mã mở khóa mới.'}
                            </p>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <button className="ui-button-primary w-full sm:w-auto" disabled={busy || !delivery.shipperId} onClick={() => setAuthorizeDialogOpen(true)} type="button">
                                    {delivery.status === 'arrived' ? 'Cấp quyền & Gửi mã qua Email' : 'Gửi lại mã mở khóa'}
                                </button>
                                {canRemoteUnlock && (
                                    <button
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition disabled:opacity-50"
                                        disabled={busy}
                                        onClick={() => setUnlockDialogOpen(true)}
                                        type="button"
                                    >
                                        <KeyRound className="h-3.5 w-3.5" />
                                        Mở khóa từ xa (Remote Unlock)
                                    </button>
                                )}
                            </div>
                        </div>}
                        <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-5 text-slate-400">
                            Nhân viên được phân công và thiết bị IoT sẽ xác minh việc mở khóa an toàn qua máy chủ trung tâm.
                        </p>
                    </Card>
                </section>

                {canCancel && (
                    <div className="pt-2">
                        <Button disabled={busy} onClick={() => setCancelDialogOpen(true)} type="button" variant="danger">
                            Hủy đơn giao hàng
                        </Button>
                    </div>
                )}
            </div>}
            <Modal
                description="Thao tác này sẽ hủy đơn giao hàng và dừng các cập nhật tiến độ tiếp theo. Lưu ý: Chỉ có thể hủy khi đơn chưa được Shipper bắt đầu vận chuyển."
                footer={<><Button disabled={busy} onClick={() => setCancelDialogOpen(false)} type="button" variant="secondary">Giữ đơn giao hàng</Button><Button disabled={busy} onClick={cancel} type="button" variant="danger">{busy ? 'Đang hủy…' : 'Xác nhận hủy'}</Button></>}
                onClose={() => setCancelDialogOpen(false)}
                open={cancelDialogOpen}
                title="Bạn có chắc muốn hủy đơn giao hàng này?"
            />
            <Modal
                description="LockShip sẽ cấp quyền cho đơn giao hàng này và gửi mã mở khóa dùng một lần qua email cho nhân viên được phân công. Mã sẽ không hiển thị tại đây."
                footer={<><Button disabled={busy} onClick={() => setAuthorizeDialogOpen(false)} type="button" variant="secondary">Xem lại sau</Button><Button disabled={busy} onClick={authorize} type="button">{busy ? 'Đang cấp quyền…' : 'Xác nhận cấp quyền'}</Button></>}
                onClose={() => setAuthorizeDialogOpen(false)}
                open={authorizeDialogOpen}
                title="Cấp quyền bàn giao an toàn?"
            />
            <Modal
                description="Hệ thống sẽ phát tín hiệu bảo mật qua MQTT đến chốt khóa thông minh / Smart Locker để mở cửa hộc tủ ngay lập tức. Hãy chắc chắn người giao hoặc người nhận đang có mặt trước tủ."
                footer={<><Button disabled={busy} onClick={() => setUnlockDialogOpen(false)} type="button" variant="secondary">Hủy thao tác</Button><Button disabled={busy} onClick={handleRemoteUnlock} type="button">{busy ? 'Đang mở khóa…' : 'Xác nhận mở khóa ngay'}</Button></>}
                onClose={() => setUnlockDialogOpen(false)}
                open={unlockDialogOpen}
                title="Mở khóa từ xa qua MQTT?"
            />
        </OwnerPage>
    )
}