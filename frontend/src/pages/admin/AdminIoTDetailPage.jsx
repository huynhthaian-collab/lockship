import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
    ExternalLink,
    Lock,
    Printer,
    QrCode,
    Radio,
    RefreshCw,
    Sparkles,
    Trash2
} from 'lucide-react'
import AdminPage from '../../components/AdminPage.jsx'
import ErrorMessage from '../../components/ErrorMessage.jsx'
import Loading from '../../components/Loading.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import SpatialTiltCard from '../../components/spatial/SpatialTiltCard.jsx'
import IsometricLocker from '../../components/spatial/IsometricLocker.jsx'
import ModernActivityTimeline from '../../components/activity/ModernActivityTimeline.jsx'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import { adminApi, boxApi } from '../../services/adminApi.js'

function formatDate(value) {
    return value ? new Date(value).toLocaleString('vi-VN') : '—'
}

export default function AdminIoTDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [device, setDevice] = useState(null)
    const [owners, setOwners] = useState([])
    const [vehicles, setVehicle] = useState([])
    const [logs, setLogs] = useState([])
    const [eventFilter, setEventFilter] = useState('all')
    const [newVehicleId, setNewVehicleId] = useState('')
    const [commandBusy, setCommandBusy] = useState(false)
    const [rebindBusy, setRebindBusy] = useState(false)
    const [reissuingQr, setReissuingQr] = useState(false)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        setError('')
        try {
            const [deviceRecord, deviceStatus, allUser, allVehicle, eventLogs] = await Promise.all([
                adminApi.device(id),
                adminApi.deviceStatus(id).catch(() => null),
                adminApi.users().catch(() => []),
                adminApi.vehicles().catch(() => []),
                adminApi.deviceLogs(id).catch(() => []),
            ])
            const merged = { ...deviceRecord, ...(deviceStatus || {}) }
            setDevice(merged)
            setOwners(Array.isArray(allUser) ? allUser : [])
            setVehicle(Array.isArray(allVehicle) ? allVehicle : [])
            setLogs(Array.isArray(eventLogs) ? eventLogs : [])
            setNewVehicleId(merged.vehicleId || '')
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải chi tiết thiết bị IoT.')
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        let active = true
        async function init() {
            try {
                const [deviceRecord, deviceStatus, allUser, allVehicle, eventLogs] = await Promise.all([
                    adminApi.device(id),
                    adminApi.deviceStatus(id).catch(() => null),
                    adminApi.users().catch(() => []),
                    adminApi.vehicles().catch(() => []),
                    adminApi.deviceLogs(id).catch(() => []),
                ])
                if (active) {
                    const merged = { ...deviceRecord, ...(deviceStatus || {}) }
                    setDevice(merged)
                    setOwners(Array.isArray(allUser) ? allUser : [])
                    setVehicle(Array.isArray(allVehicle) ? allVehicle : [])
                    setLogs(Array.isArray(eventLogs) ? eventLogs : [])
                    setNewVehicleId(merged.vehicleId || '')
                    setLoading(false)
                }
            } catch (err) {
                if (active) {
                    setError(err.message || 'Không thể tải chi tiết thiết bị IoT.')
                    setLoading(false)
                }
            }
        }
        init()
        return () => { active = false }
    }, [id])

    const onStatus = useCallback(
        (event) => {
            if (event.deviceId === device?.deviceId) {
                setDevice((current) => (current ? { ...current, ...event } : current))
            }
        },
        [device?.deviceId]
    )

    const onAlert = useCallback(
        (event) => {
            if (event.deviceId === device?.deviceId) {
                refresh()
            }
        },
        [device?.deviceId, refresh]
    )

    useSocketEvent('iot:status', onStatus)
    useSocketEvent('iot:alert', onAlert)

    const owner = useMemo(() => owners.find((o) => o._id === device?.ownerId), [owners, device?.ownerId])
    const currentVehicle = useMemo(() => vehicles.find((v) => v._id === device?.vehicleId), [vehicles, device?.vehicleId])

    const availableOwnerVehicle = useMemo(() => {
        if (!device?.ownerId) return []
        return vehicles.filter(
            (v) =>
                v.ownerId === device.ownerId &&
                v.status === 'active' &&
                (!v.iotDeviceId || v.iotDeviceId === device.deviceId)
        )
    }, [vehicles, device])

    async function sendCommand(command) {
        setCommandBusy(true)
        setError('')
        setNotice('')
        try {
            await adminApi.sendCommand(id, command)
            setNotice(`Đã gửi lệnh MQTT "${command}" thành công đến ${device?.deviceId}.`)
            await refresh()
        } catch (requestError) {
            setError(requestError.message || `Lỗi khi gửi lệnh ${command}.`)
        } finally {
            setCommandBusy(false)
        }
    }

    async function handleRebindVehicle(event) {
        event.preventDefault()
        if (!newVehicleId || newVehicleId === String(device?.vehicleId)) return
        setRebindBusy(true)
        setError('')
        setNotice('')
        try {
            await adminApi.updateDevice(id, { vehicleId: newVehicleId })
            setNotice('Đã liên kết lại phương tiện với thiết bị IoT thành công.')
            await refresh()
        } catch (requestError) {
            setError(requestError.message || 'Không thể liên kết lại phương tiện.')
        } finally {
            setRebindBusy(false)
        }
    }

    async function handleReissueBoxQr() {
        if (!device?.deviceId) return
        setReissuingQr(true)
        setError('')
        setNotice('')
        try {
            await boxApi.generateBoxQr(device.deviceId)
            setNotice(`Đã cấp phát mã QR mới cho Box "${device.deviceId}" thành công!`)
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Không thể cấp phát lại mã QR.')
        } finally {
            setReissuingQr(false)
        }
    }

    async function handleDeleteDevice() {
        setDeleting(true)
        setError('')
        try {
            await adminApi.deleteDevice(id)
            navigate('/admin/iot', { replace: true })
        } catch (requestError) {
            setError(requestError.message || 'Không thể xóa thiết bị.')
            setDeleteModalOpen(false)
            setDeleting(false)
        }
    }

    const eventTypes = useMemo(() => ['all', ...new Set(logs.map((l) => l.type))], [logs])

    const filteredLogs = useMemo(() => {
        if (eventFilter === 'all') return logs
        return logs.filter((l) => l.type === eventFilter)
    }, [logs, eventFilter])

    if (loading) return <Loading label="Đang tải dữ liệu thiết bị IoT..." />

    return (
        <AdminPage
            eyebrow="Chi tiết phần cứng IoT"
            title={device ? device.deviceId : 'Chi tiết thiết bị'}
            description={`Định danh phần cứng: ${id} · Model: Khóa hàng hóa điện tử thông minh ESP32`}
            action={
                <Button
                    onClick={() => setDeleteModalOpen(true)}
                    type="button"
                    variant="danger"
                >
                    <Trash2 size={15} /> Xóa thiết bị
                </Button>
            }
        >
            <div className="flex items-center justify-between pb-1">
                <Link className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400 no-underline transition hover:text-cyan-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" to="/admin/iot">
                    ← Quay lại danh sách khóa
                </Link>
                {device && (
                    <div className="flex items-center gap-2">
                        <StatusPill value={device.status} />
                        <StatusPill value={device.lockStatus} />
                    </div>
                )}
            </div>

            {error && <ErrorMessage message={error} />}
            {notice && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs sm:text-sm text-emerald-200 backdrop-blur-md shadow-[0_0_16px_rgba(16,185,129,0.2)]" role="status">
                    {notice}
                </div>
            )}

            {device && (
                <div className="space-y-6">
                    {/* Live Telemetry & 3D Locker Stage */}
                    <div className="grid gap-6 lg:grid-cols-[1.2fr_1.8fr]">
                        <SpatialTiltCard className="flex flex-col items-center justify-center p-6 text-center" glareColor="rgba(59, 130, 246, 0.3)">
                            <div className="mb-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold text-cyan-300">
                                    <span className="size-1.5 animate-pulse rounded-full bg-cyan-400" />
                                    Mô phỏng cơ điện tử 3D
                                </span>
                            </div>
                            <div className="py-6">
                                <IsometricLocker
                                    battery={device.battery ?? 100}
                                    className="scale-110 sm:scale-125"
                                    deviceId={device.deviceId}
                                    lockStatus={device.lockStatus}
                                    status={device.status}
                                />
                            </div>
                            <p className="text-xs text-slate-400">
                                Đồng bộ trạng thái chốt khóa thời gian thực với broker MQTT
                            </p>
                        </SpatialTiltCard>

                        <Card title="Thông số kỹ thuật thiết bị" description="Dữ liệu cảm biến viễn thám và kết nối MQTT">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Trạng thái kết nối</p>
                                    <div className="mt-2.5"><StatusPill value={device.status} /></div>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Chốt khóa cơ học</p>
                                    <div className="mt-2.5"><StatusPill value={device.lockStatus} /></div>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Dung lượng pin</p>
                                    <p className="mt-1.5 font-mono text-2xl font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                                        {device.battery == null ? '—' : `${device.battery}%`}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Phiên bản Firmware</p>
                                    <p className="mt-1.5 font-mono text-sm font-semibold text-slate-200">
                                        {device.firmwareVersion || 'v1.0.0-release'}
                                    </p>
                                </div>
                                <div className="sm:col-span-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Thời gian nhận gói tin gần nhất</p>
                                    <p className="mt-1.5 text-sm font-medium text-slate-200 font-mono">
                                        {formatDate(device.lastSeen)}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Split Row: Device Commands & Vehicle Rebinding */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Device Commands Panel */}
                        <Card
                            title="Lệnh điều khiển MQTT an toàn"
                            description="Gửi tín hiệu chẩn đoán và điều khiển quản trị trực tiếp đến vi điều khiển qua MQTT"
                        >
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    className="ui-button-secondary flex flex-col items-center justify-center p-4 text-center group"
                                    disabled={commandBusy}
                                    onClick={() => sendCommand('PING')}
                                    type="button"
                                >
                                    <Radio className="size-5 text-cyan-400 transition group-hover:scale-110" />
                                    <span className="mt-2 font-mono text-xs font-bold text-white">PING</span>
                                    <span className="text-[10px] text-slate-400">Đo độ trễ</span>
                                </button>

                                <button
                                    className="ui-button-secondary flex flex-col items-center justify-center p-4 text-center group"
                                    disabled={commandBusy}
                                    onClick={() => sendCommand('STATUS')}
                                    type="button"
                                >
                                    <RefreshCw className="size-5 text-blue-400 transition group-hover:scale-110" />
                                    <span className="mt-2 font-mono text-xs font-bold text-white">STATUS</span>
                                    <span className="text-[10px] text-slate-400">Lấy dữ liệu</span>
                                </button>

                                <button
                                    className="ui-button-secondary flex flex-col items-center justify-center p-4 text-center group hover:border-rose-400/50"
                                    disabled={commandBusy}
                                    onClick={() => sendCommand('LOCK')}
                                    type="button"
                                >
                                    <Lock className="size-5 text-rose-400 transition group-hover:scale-110" />
                                    <span className="mt-2 font-mono text-xs font-bold text-white">LOCK</span>
                                    <span className="text-[10px] text-slate-400">Khóa chốt</span>
                                </button>
                            </div>

                            <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-relaxed text-slate-400">
                                <strong>Chính sách bảo mật:</strong> Quản trị viên chỉ được phép gửi các lệnh chẩn đoán (PING, STATUS, LOCK). Lệnh UNLOCK (mở chốt) chỉ được thực thi thông qua quy trình xác thực mã OTP một lần do chủ sở hữu cấp cho shipper.
                            </p>
                        </Card>

                        {/* Vehicle & Owner Affiliation */}
                        <Card
                            title="Liên kết & Quyền sở hữu"
                            description="Thông tin chủ xe và phương tiện hiện đang được trang bị khóa"
                        >
                            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 font-semibold">Chủ sở hữu:</span>
                                    {owner ? (
                                        <Link to={`/admin/users/${owner._id}`} className="font-semibold text-cyan-400 hover:text-cyan-300 hover:underline">
                                            {owner.name} ({owner.email})
                                        </Link>
                                    ) : (
                                        <span className="font-mono text-slate-400">{device.ownerId}</span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between border-t border-white/5 pt-2">
                                    <span className="text-slate-400 font-semibold">Phương tiện gắn khóa:</span>
                                    {currentVehicle ? (
                                        <span className="font-mono font-bold text-white">
                                            {currentVehicle.plateNumber} ({currentVehicle.model})
                                        </span>
                                    ) : (
                                        <span className="text-amber-400 italic">Chưa gắn xe</span>
                                    )}
                                </div>
                            </div>

                            {/* Rebind Vehicle Form */}
                            <form className="mt-4 space-y-3" onSubmit={handleRebindVehicle}>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                                    Chuyển liên kết sang phương tiện khác (cùng chủ xe)
                                    <select
                                        className="ui-control mt-2"
                                        onChange={(e) => setNewVehicleId(e.target.value)}
                                        value={newVehicleId}
                                    >
                                        <option value="">Chọn phương tiện...</option>
                                        {availableOwnerVehicle.map((v) => (
                                            <option key={v._id} value={v._id}>
                                                {v.plateNumber} ({v.type} • {v.model}) {v._id === device.vehicleId ? '• (Đang gắn)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <button
                                    className="ui-button-primary px-4 py-2 text-xs font-semibold"
                                    disabled={rebindBusy || !newVehicleId || newVehicleId === String(device.vehicleId)}
                                    type="submit"
                                >
                                    {rebindBusy ? 'Đang lưu...' : 'Lưu liên kết phương tiện'}
                                </button>
                            </form>
                        </Card>
                    </div>

                    {/* Cấp phát & Quản lý Mã QR Tủ khóa - Admin Only */}
                    <Card
                        title={
                            <div className="flex items-center gap-2">
                                <QrCode className="w-5 h-5 text-cyan-400" />
                                <span>Mã QR Định Danh & Cấp Phát Tủ Khóa (Box QR Code)</span>
                            </div>
                        }
                        description="Mã QR dán trên thân tủ để Shipper vãng lai quét camera gửi yêu cầu mở tủ và liên kết đơn hàng"
                        action={
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="ui-button-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                                >
                                    <Printer className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>In mã QR</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={reissuingQr}
                                    onClick={handleReissueBoxQr}
                                    className="ui-button-primary text-xs px-3.5 py-1.5 inline-flex items-center gap-1.5"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${reissuingQr ? 'animate-spin' : ''}`} />
                                    <span>Cấp phát QR mới cho Box</span>
                                </button>
                            </div>
                        }
                    >
                        <div className="flex flex-col sm:flex-row items-center gap-6 p-2">
                            <div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-cyan-500/30 shrink-0 text-center">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                                        `https://lockship-gamma.vercel.app/public/box-scan/${device.deviceId}`
                                    )}`}
                                    alt={`QR code for ${device.deviceId}`}
                                    className="w-36 h-36 block mx-auto object-contain"
                                />
                                <p className="text-[10px] font-mono font-bold text-slate-800 mt-1">
                                    {device.deviceId}
                                </p>
                            </div>

                            <div className="space-y-3 text-center sm:text-left flex-1">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-white">
                                        Chỉ Quản trị viên (Admin) mới có quyền tạo và cấp phát mã QR cho tủ khóa.
                                    </p>
                                    <p className="text-xs text-slate-400 font-mono break-all">
                                        https://lockship-gamma.vercel.app/public/box-scan/{device.deviceId}
                                    </p>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    Bạn có thể in mã QR này dưới dạng nhãn decal dán trực tiếp lên tủ khóa IoT để phục vụ Shipper vãng lai quét mở tủ.
                                </p>
                                <div className="flex flex-wrap gap-2.5 justify-center sm:justify-start pt-1">
                                    <Link
                                        to={`/admin/qr-tester`}
                                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 inline-flex items-center gap-1.5 transition-colors"
                                    >
                                        <QrCode className="w-4 h-4 text-cyan-400" />
                                        <span>Mở Studio Quản Lý QR</span>
                                    </Link>
                                    <a
                                        href={`https://lockship-gamma.vercel.app/public/box-scan/${device.deviceId}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold border border-cyan-500/40 inline-flex items-center gap-1.5 transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        <span>Mở thử trang quét QR</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Recorded Events Log */}
                    <Card
                        title="Sự kiện thiết bị & Nhật ký kiểm toán"
                        description="Dữ liệu lịch sử, cảnh báo và phản hồi lệnh MQTT của thiết bị đã được chuẩn hóa thân thiện"
                    >
                        <ModernActivityTimeline
                            emptyDescription="Các sự kiện kết nối, thay đổi chốt và cảnh báo sẽ xuất hiện tại đây khi thiết bị truyền dữ liệu."
                            emptyMessage="Chưa có sự kiện nào cho thiết bị này"
                            logs={logs.map((l) => ({ ...l, deviceId: l.deviceId || device?.deviceId }))}
                        />
                    </Card>
                </div>
            )}

            {/* Modal Confirm Delete */}
            <Modal
                description={`Thao tác này sẽ xóa thiết bị "${device?.deviceId}" khỏi hệ thống và hủy liên kết với phương tiện.`}
                footer={
                    <>
                        <Button disabled={deleting} onClick={() => setDeleteModalOpen(false)} type="button" variant="secondary">
                            Hủy bỏ
                        </Button>
                        <Button disabled={deleting} onClick={handleDeleteDevice} type="button" variant="danger">
                            {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                        </Button>
                    </>
                }
                onClose={() => setDeleteModalOpen(false)}
                open={deleteModalOpen}
                title="Xác nhận xóa thiết bị IoT?"
            />
        </AdminPage>
    )
}