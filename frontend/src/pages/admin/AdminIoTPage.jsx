import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BatteryCharging, LockKeyhole, Plus, RefreshCw, Search, UnlockKeyhole, Wifi, X } from 'lucide-react'
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

const emptyDeviceForm = { deviceId: '', ownerId: '', vehicleId: '' }

export default function AdminIoTPage() {
    const [devices, setDevices] = useState([])
    const [owners, setOwners] = useState([])
    const [vehicles, setVehicle] = useState([])
    const [showRegister, setShowRegister] = useState(false)
    const [form, setForm] = useState(emptyDeviceForm)
    const [statusFilter, setStatusFilter] = useState('all')
    const [lockFilter, setLockFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [refreshing, setRefreshing] = useState(false)

    const refresh = useCallback(async (isSilent = false) => {
        if (!isSilent) setError('')
        setRefreshing(true)
        try {
            const [allDevices, allUser, allVehicle] = await Promise.all([
                adminApi.devices().catch(() => []),
                adminApi.users().catch(() => []),
                adminApi.vehicles().catch(() => []),
            ])
            setDevices(Array.isArray(allDevices) ? allDevices : [])
            setOwners(Array.isArray(allUser) ? allUser.filter((u) => u.role === 'owner' && u.status === 'active') : [])
            setVehicle(Array.isArray(allVehicle) ? allVehicle : [])
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải danh sách thiết bị.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        let active = true
        async function init() {
            try {
                const [allDevices, allUser, allVehicle] = await Promise.all([
                    adminApi.devices().catch(() => []),
                    adminApi.users().catch(() => []),
                    adminApi.vehicles().catch(() => []),
                ])
                if (active) {
                    setDevices(Array.isArray(allDevices) ? allDevices : [])
                    setOwners(Array.isArray(allUser) ? allUser.filter((u) => u.role === 'owner' && u.status === 'active') : [])
                    setVehicle(Array.isArray(allVehicle) ? allVehicle : [])
                    setLoading(false)
                }
            } catch (err) {
                if (active) {
                    setError(err.message || 'Không thể tải danh sách thiết bị.')
                    setLoading(false)
                }
            }
        }
        init()
        return () => { active = false }
    }, [])

    const onStatus = useCallback((event) => {
        setDevices((current) =>
            current.map((device) => (device.deviceId === event.deviceId ? { ...device, ...event } : device))
        )
    }, [])

    const onAlert = useCallback(() => {
        refresh(true)
    }, [refresh])

    useSocketEvent('iot:status', onStatus)
    useSocketEvent('iot:alert', onAlert)

    const ownerMap = useMemo(() => new Map(owners.map((o) => [o._id, o])), [owners])
    const vehicleMap = useMemo(() => new Map(vehicles.map((v) => [v._id, v])), [vehicles])

    const availableVehicleForOwner = useMemo(() => {
        if (!form.ownerId) return []
        return vehicles.filter((v) => v.ownerId === form.ownerId && v.status === 'active' && !v.iotDeviceId)
    }, [vehicles, form.ownerId])

    const filteredDevices = useMemo(() => {
        return devices.filter((device) => {
            if (statusFilter !== 'all' && device.status !== statusFilter) return false
            if (lockFilter !== 'all' && device.lockStatus !== lockFilter) return false

            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase()
                const devId = (device.deviceId || '').toLowerCase()
                const owner = ownerMap.get(device.ownerId)
                const ownerName = (owner?.name || '').toLowerCase()
                const vehicle = vehicleMap.get(device.vehicleId)
                const plate = (vehicle?.plateNumber || '').toLowerCase()

                if (!devId.includes(term) && !ownerName.includes(term) && !plate.includes(term)) {
                    return false
                }
            }
            return true
        })
    }, [devices, statusFilter, lockFilter, searchTerm, ownerMap, vehicleMap])

    async function handleRegisterDevice(event) {
        event.preventDefault()
        setError('')
        setNotice('')

        const trimmedId = form.deviceId.trim()
        if (!/^[A-Za-z0-9_-]{3,100}$/.test(trimmedId)) {
            setError('Mã thiết bị phải dài 3–100 ký tự, chỉ gồm chữ cái, chữ số, dấu gạch ngang hoặc gạch dưới.')
            return
        }
        if (!form.ownerId || !form.vehicleId) {
            setError('Hãy chọn chủ sở hữu và phương tiện chưa liên kết.')
            return
        }

        setSaving(true)
        try {
            await adminApi.createDevice({
                deviceId: trimmedId,
                ownerId: form.ownerId,
                vehicleId: form.vehicleId,
            })
            setNotice(`Đã đăng ký thiết bị "${trimmedId}" và liên kết thành công.`)
            setForm(emptyDeviceForm)
            setShowRegister(false)
            await refresh(true)
        } catch (requestError) {
            setError(requestError.message || 'Không thể đăng ký thiết bị.')
        } finally {
            setSaving(false)
        }
    }

    async function handleDeleteDevice(device) {
        if (!window.confirm(`Xóa thiết bị IoT "${device.deviceId}"? Thiết bị sẽ bị hủy liên kết với phương tiện.`)) {
            return
        }
        setError('')
        setNotice('')
        setDeletingId(device._id)
        try {
            await adminApi.deleteDevice(device._id)
            setNotice(`Đã xóa thiết bị "${device.deviceId}".`)
            await refresh(true)
        } catch (requestError) {
            setError(requestError.message || 'Không thể xóa thiết bị.')
        } finally {
            setDeletingId(null)
        }
    }

    const onlineCount = devices.filter((d) => d.status === 'online').length
    const offlineCount = devices.filter((d) => d.status !== 'online').length
    const lockedCount = devices.filter((d) => d.lockStatus === 'locked').length
    const unlockedCount = devices.filter((d) => d.lockStatus === 'unlocked').length
    const lowPinCount = devices.filter((d) => d.battery != null && d.battery < 20).length

    return (
        <AdminPage
            eyebrow="Phần cứng IoT & Viễn thám"
            title="Quản lý khóa thông minh IoT"
            description="Theo dõi dữ liệu MQTT thời gian thực, trạng thái chốt khóa điện tử, dung lượng pin và tính toàn vẹn kết nối."
            action={
                <div className="flex items-center gap-3">
                    <button
                        className="ui-button-secondary gap-1.5 px-3.5 py-2 text-xs font-semibold"
                        disabled={refreshing}
                        onClick={() => refresh()}
                        type="button"
                    >
                        <RefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
                        {refreshing ? 'Đang cập nhật...' : 'Làm mới'}
                    </button>
                    <button
                        className="ui-button-primary gap-1.5 text-xs font-semibold"
                        onClick={() => setShowRegister((prev) => !prev)}
                        type="button"
                    >
                        {showRegister ? '✕ Đóng biểu mẫu' : <><Plus size={15} /> Đăng ký thiết bị</>}
                    </button>
                </div>
            }
        >
            {error && <ErrorMessage message={error} />}
            {notice && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs sm:text-sm text-emerald-200 backdrop-blur-md shadow-[0_0_16px_rgba(16,185,129,0.2)]" role="status">
                    {notice}
                </div>
            )}

            {/* Metrics cards: Spatial Tilt Bento */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Tóm tắt thiết bị">
                <SpatialTiltCard className="rounded-2xl" maxTilt={6}>
                    <div className="spatial-card p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng số khóa</span>
                            <span className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300">
                                <LockKeyhole size={16} />
                            </span>
                        </div>
                        <p className="mt-2 text-2xl font-extrabold tabular-nums text-white">{devices.length}</p>
                        <p className="mt-1 text-xs text-slate-400">Đã đăng ký máy chủ</p>
                    </div>
                </SpatialTiltCard>

                <SpatialTiltCard className="rounded-2xl" maxTilt={6}>
                    <div className="spatial-card p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Đang trực tuyến</span>
                            <span className="grid size-9 place-items-center rounded-xl border border-emerald-500/20 bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                                <Wifi size={16} />
                            </span>
                        </div>
                        <p className="mt-2 text-2xl font-extrabold tabular-nums text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                            {onlineCount}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{offlineCount} ngoại tuyến</p>
                    </div>
                </SpatialTiltCard>

                <SpatialTiltCard className="rounded-2xl" maxTilt={6}>
                    <div className="spatial-card p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Đang khóa an toàn</span>
                            <span className="grid size-9 place-items-center rounded-xl border border-rose-500/20 bg-rose-500/15 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                                <LockKeyhole size={16} />
                            </span>
                        </div>
                        <p className="mt-2 text-2xl font-extrabold tabular-nums text-rose-300 drop-shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                            {lockedCount}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">Chốt khóa vật lý gài</p>
                    </div>
                </SpatialTiltCard>

                <SpatialTiltCard className="rounded-2xl" maxTilt={6}>
                    <div className="spatial-card p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Đã mở khóa</span>
                            <span className="grid size-9 place-items-center rounded-xl border border-cyan-500/20 bg-cyan-500/15 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                                <UnlockKeyhole size={16} />
                            </span>
                        </div>
                        <p className="mt-2 text-2xl font-extrabold tabular-nums text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                            {unlockedCount}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">Chốt đã rút hoàn toàn</p>
                    </div>
                </SpatialTiltCard>

                <SpatialTiltCard className="rounded-2xl" maxTilt={6}>
                    <div className="spatial-card p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cảnh báo pin</span>
                            <span className="grid size-9 place-items-center rounded-xl border border-amber-500/20 bg-amber-500/15 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                                <BatteryCharging size={16} />
                            </span>
                        </div>
                        <p className={`mt-2 text-2xl font-extrabold tabular-nums ${lowPinCount > 0 ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.3)]' : 'text-slate-400'}`}>
                            {lowPinCount}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">Mức pin &lt;20%</p>
                    </div>
                </SpatialTiltCard>
            </section>

            {/* Registration Form in Collapsible Card */}
            {showRegister && (
                <Card
                    title="Đăng ký khóa thông minh IoT mới"
                    description="Khởi tạo định danh thiết bị và liên kết trực tiếp với phương tiện của chủ sở hữu"
                >
                    <form className="space-y-4" onSubmit={handleRegisterDevice}>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                                    Mã định danh thiết bị <span className="text-red-400">*</span>
                                </label>
                                <input
                                    className="ui-control mt-2 font-mono"
                                    maxLength={100}
                                    minLength={3}
                                    onChange={(event) => setForm({ ...form, deviceId: event.target.value })}
                                    placeholder="LOCK-001"
                                    required
                                    value={form.deviceId}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                                    Tổ chức chủ sở hữu <span className="text-red-400">*</span>
                                </label>
                                <select
                                    className="ui-control mt-2"
                                    onChange={(event) => setForm({ ...form, ownerId: event.target.value, vehicleId: '' })}
                                    required
                                    value={form.ownerId}
                                >
                                    <option value="">Chọn chủ sở hữu đội xe...</option>
                                    {owners.map((owner) => (
                                        <option key={owner._id} value={owner._id}>
                                            {owner.name} ({owner.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                                    Phương tiện liên kết <span className="text-red-400">*</span>
                                </label>
                                <select
                                    className="ui-control mt-2"
                                    disabled={!form.ownerId}
                                    onChange={(event) => setForm({ ...form, vehicleId: event.target.value })}
                                    required
                                    value={form.vehicleId}
                                >
                                    <option value="">
                                        {!form.ownerId
                                            ? 'Vui lòng chọn chủ sở hữu trước'
                                            : availableVehicleForOwner.length === 0
                                            ? 'Không có phương tiện chưa liên kết'
                                            : 'Chọn phương tiện cần liên kết...'}
                                    </option>
                                    {availableVehicleForOwner.map((v) => (
                                        <option key={v._id} value={v._id}>
                                            {v.plateNumber} ({v.type} • {v.model})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            {saving ? (
                                <Loading label="Đang đăng ký thiết bị..." />
                            ) : (
                                <>
                                    <button className="ui-button-primary px-5 py-2.5 text-xs font-semibold" type="submit">
                                        Đăng ký và liên kết
                                    </button>
                                    <button
                                        className="ui-button-secondary px-4 py-2.5 text-xs font-semibold"
                                        onClick={() => setShowRegister(false)}
                                        type="button"
                                    >
                                        Hủy
                                    </button>
                                </>
                            )}
                        </div>
                    </form>
                </Card>
            )}

            {/* Filter and Search Bar */}
            <Card bodyClassName="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                        <input
                            aria-label="Tìm kiếm thiết bị"
                            className="ui-control pl-10 pr-9 text-xs sm:text-sm"
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Tìm mã thiết bị, chủ xe, biển số..."
                            value={searchTerm}
                        />
                        {searchTerm && (
                            <button
                                aria-label="Xóa tìm kiếm"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                onClick={() => setSearchTerm('')}
                                type="button"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                            <span>Kết nối:</span>
                            <select
                                className="ui-control w-auto py-1.5 text-xs"
                                onChange={(e) => setStatusFilter(e.target.value)}
                                value={statusFilter}
                            >
                                <option value="all">Tất cả</option>
                                <option value="online">Trực tuyến</option>
                                <option value="offline">Ngoại tuyến</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                            <span>Chốt khóa:</span>
                            <select
                                className="ui-control w-auto py-1.5 text-xs"
                                onChange={(e) => setLockFilter(e.target.value)}
                                value={lockFilter}
                            >
                                <option value="all">Tất cả</option>
                                <option value="locked">Đã khóa</option>
                                <option value="unlocked">Đã mở</option>
                            </select>
                        </div>
                    </div>
                </div>
            </Card>

            {/* IoT Device Table */}
            {loading ? (
                <Loading label="Đang tải danh sách thiết bị IoT..." />
            ) : filteredDevices.length === 0 ? (
                <Card>
                    <EmptyState
                        title={devices.length ? 'Không tìm thấy thiết bị phù hợp' : 'Chưa có khóa IoT nào'}
                        description={devices.length ? 'Hãy thử điều chỉnh từ khóa tìm kiếm hoặc bộ lọc trạng thái.' : 'Bấm nút "Đăng ký thiết bị" ở trên để thêm khóa mới.'}
                    />
                </Card>
            ) : (
                <Card
                    title="Danh sách thiết bị khóa thông minh"
                    description={`Hiển thị ${filteredDevices.length} trên tổng số ${devices.length} thiết bị`}
                    bodyClassName="p-0"
                >
                    <div className="hidden md:block overflow-x-auto">
                        <Table className="min-w-[62rem]">
                            <thead className="border-b border-white/10 bg-white/[0.03] text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                <tr>
                                    <th className="px-5 py-3.5">Mã thiết bị</th>
                                    <th className="px-5 py-3.5">Chủ sở hữu</th>
                                    <th className="px-5 py-3.5">Phương tiện gắn khóa</th>
                                    <th className="px-5 py-3.5">Kết nối</th>
                                    <th className="px-5 py-3.5">Chốt khóa</th>
                                    <th className="px-5 py-3.5">Dung lượng pin</th>
                                    <th className="px-5 py-3.5">Tín hiệu gần nhất</th>
                                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredDevices.map((device) => {
                                    const owner = ownerMap.get(device.ownerId)
                                    const vehicle = vehicleMap.get(device.vehicleId)
                                    const isBusy = deletingId === device._id

                                    return (
                                        <tr className="transition hover:bg-white/[0.04]" key={device._id}>
                                            <td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]">
                                                {device.deviceId}
                                            </td>
                                            <td className="px-5 py-4 text-xs">
                                                {owner ? (
                                                    <Link to={`/admin/users/${owner._id}`} className="font-semibold text-white hover:text-cyan-300 hover:underline">
                                                        {owner.name}
                                                    </Link>
                                                ) : (
                                                    <span className="font-mono text-slate-400">{device.ownerId ? `#${device.ownerId.slice(-6)}` : '—'}</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-xs">
                                                {vehicle ? (
                                                    <div className="font-mono">
                                                        <span className="font-bold text-slate-200">{vehicle.plateNumber}</span>
                                                        <span className="text-slate-400 ml-1">({vehicle.model})</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-500 italic">Chưa liên kết</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <StatusPill value={device.status} />
                                            </td>
                                            <td className="px-5 py-4">
                                                <StatusPill value={device.lockStatus} />
                                            </td>
                                            <td className="px-5 py-4">
                                                {device.battery == null ? (
                                                    <span className="text-slate-500 text-xs">—</span>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-xs font-mono font-semibold">
                                                        <span className={device.battery < 20 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                                                            {device.battery}%
                                                        </span>
                                                        <div className="h-1.5 w-12 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                                                            <div
                                                                className={`h-full ${
                                                                    device.battery < 20
                                                                        ? 'bg-rose-500'
                                                                        : device.battery < 50
                                                                        ? 'bg-amber-500'
                                                                        : 'bg-emerald-500'
                                                                }`}
                                                                style={{ width: `${Math.min(100, Math.max(0, device.battery))}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap font-mono">
                                                {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString('vi-VN') : 'Chưa ghi nhận'}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2.5">
                                                    <Link
                                                        className="ui-button-secondary px-3 py-1.5 text-xs font-semibold"
                                                        to={`/admin/iot/${device._id}`}
                                                    >
                                                        Chi tiết
                                                    </Link>
                                                    <button
                                                        className="text-xs font-bold text-rose-400 hover:text-rose-300 disabled:opacity-50 transition"
                                                        disabled={isBusy}
                                                        onClick={() => handleDeleteDevice(device)}
                                                        type="button"
                                                    >
                                                        {isBusy ? 'Đang xóa...' : 'Xóa'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </Table>
                    </div>

                    {/* Mobile cards */}
                    <div className="grid gap-3 p-4 md:hidden">
                        {filteredDevices.map((device) => {
                            const owner = ownerMap.get(device.ownerId)
                            const vehicle = vehicleMap.get(device.vehicleId)
                            const isBusy = deletingId === device._id
                            return (
                                <div className="spatial-card p-4 space-y-3" key={device._id}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-mono text-xs font-bold text-cyan-300">{device.deviceId}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{owner?.name || 'Không rõ chủ xe'}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <StatusPill value={device.status} />
                                            <StatusPill value={device.lockStatus} />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-300 font-mono">
                                        Xe: {vehicle?.plateNumber || 'Chưa gắn xe'} · Pin: {device.battery == null ? '—' : `${device.battery}%`}
                                    </p>
                                    <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                                        <Link className="font-semibold text-cyan-400" to={`/admin/iot/${device._id}`}>
                                            Xem chi tiết →
                                        </Link>
                                        <button
                                            className="text-rose-400 font-semibold disabled:opacity-50"
                                            disabled={isBusy}
                                            onClick={() => handleDeleteDevice(device)}
                                            type="button"
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </Card>
            )}
        </AdminPage>
    )
}