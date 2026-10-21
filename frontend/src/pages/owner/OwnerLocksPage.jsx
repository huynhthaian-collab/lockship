import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    BatteryMedium,
    LockKeyhole,
    Search,
    Wifi,
    WifiOff,
    Box,
    MapPin,
    CheckCircle2,
    Lock,
    Unlock,
    Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import OwnerPage from '../../components/OwnerPage.jsx'
import { OwnerError, OwnerLoading } from '../../components/OwnerFeedback.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import SpatialTiltCard from '../../components/spatial/SpatialTiltCard.jsx'
import InteractiveMapPicker from '../../components/gis/InteractiveMapPicker.jsx'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import { deviceApi, vehicleApi } from '../../services/ownerApi.js'
import { LOCKSHIP_BOXES } from '../../data/smartLockerBoxes.js'

function formatDate(value) {
    return value ? new Date(value).toLocaleString('vi-VN') : 'Chưa có dữ liệu'
}

export default function OwnerLocksPage() {
    const [devices, setDevices] = useState([])
    const [vehicles, setVehicle] = useState([])
    const [search, setSearch] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)

    // Case A: 3 Smart Locker Boxes GIS state
    const [smartBoxes, setSmartBoxes] = useState(LOCKSHIP_BOXES)
    const [selectedBox, setSelectedBox] = useState(LOCKSHIP_BOXES[0])
    const [boxFilter, setBoxFilter] = useState('ALL') // 'ALL' | 'Available' | 'Locked' | 'Unlocked'
    const [mapCenter, setMapCenter] = useState({ lat: LOCKSHIP_BOXES[0].lat, lng: LOCKSHIP_BOXES[0].lon })

    const refresh = useCallback(async () => {
        setError('')
        try {
            const [deviceRecords, vehicleRecords] = await Promise.all([deviceApi.list(), vehicleApi.list()])
            setDevices(deviceRecords)
            setVehicle(vehicleRecords)
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    const onStatus = useCallback((event) => {
        setDevices((current) => current.map((device) => device.deviceId === event.deviceId ? { ...device, ...event } : device))
    }, [])

    useSocketEvent('iot:status', onStatus)
    useSocketEvent('iot:alert', refresh)

    const visible = useMemo(() => devices.filter((device) => {
        const vehicle = vehicles.find((item) => item._id === device.vehicleId)
        return `${device.deviceId} ${vehicle?.plateNumber || ''}`.toLowerCase().includes(search.trim().toLowerCase())
    }), [devices, search, vehicles])

    const online = devices.filter((device) => device.status === 'online').length
    const offline = devices.filter((device) => device.status === 'offline').length
    const unlocked = devices.filter((device) => device.lockStatus === 'unlocked').length

    // Filtered Smart Locker Boxes
    const filteredBoxes = useMemo(() => {
        if (boxFilter === 'ALL') return smartBoxes
        return smartBoxes.filter((box) => box.status === boxFilter)
    }, [smartBoxes, boxFilter])

    // Select Box handler (both from card and map)
    const handleSelectBox = (box) => {
        setSelectedBox(box)
        setMapCenter({ lat: box.lat, lng: box.lon })
    }

    return (
        <OwnerPage
            eyebrow="Hạ tầng Smart Locker & Đội xe"
            title="Quản lý Tủ khóa & Thiết bị IoT"
            description="Giám sát vị trí trạm Smart Locker Box trên bản đồ GIS tương tác và theo dõi trạng thái khóa IoT phương tiện theo thời gian thực."
        >
            <OwnerError error={error} onRetry={refresh} />
            {loading ? (
                <OwnerLoading label="Đang tải dữ liệu khóa thông minh..." />
            ) : (
                <>
                    {/* Top Stats Overview */}
                    <section aria-label="Số liệu khóa thông minh" className="grid gap-4 sm:grid-cols-4">
                        <SpatialTiltCard className="p-5" glareColor="rgba(16, 185, 129, 0.2)">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Trạm Box Khả Dụng</p>
                                    <p className="mt-1 text-3xl font-extrabold tabular-nums text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                                        {smartBoxes.filter((b) => b.status === 'Available').length} / {smartBoxes.length}
                                    </p>
                                </div>
                                <span className="grid size-12 place-items-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.25)]">
                                    <Box size={22} />
                                </span>
                            </div>
                        </SpatialTiltCard>

                        <SpatialTiltCard className="p-5" glareColor="rgba(34, 211, 238, 0.2)">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Xe Đang Trực Tuyến</p>
                                    <p className="mt-1 text-3xl font-extrabold tabular-nums text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.3)]">
                                        {online}
                                    </p>
                                </div>
                                <span className="grid size-12 place-items-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.25)]">
                                    <Wifi size={22} />
                                </span>
                            </div>
                        </SpatialTiltCard>

                        <SpatialTiltCard className="p-5" glareColor="rgba(148, 163, 184, 0.2)">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Xe Ngoại Tuyến</p>
                                    <p className="mt-1 text-3xl font-extrabold tabular-nums text-slate-300">{offline}</p>
                                </div>
                                <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-400">
                                    <WifiOff size={22} />
                                </span>
                            </div>
                        </SpatialTiltCard>

                        <SpatialTiltCard className="p-5" glareColor="rgba(59, 130, 246, 0.2)">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Khóa Đang Mở</p>
                                    <p className="mt-1 text-3xl font-extrabold tabular-nums text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.3)]">
                                        {unlocked}
                                    </p>
                                </div>
                                <span className="grid size-12 place-items-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400 shadow-[0_0_16px_rgba(59,130,246,0.25)]">
                                    <LockKeyhole size={22} />
                                </span>
                            </div>
                        </SpatialTiltCard>
                    </section>

                    {/* CASE A: Smart Locker Boxes GIS Interactive Map & 3 Boxes Section */}
                    <Card
                        description="Vị trí thực địa, tình trạng khóa và hộc tủ của 3 trạm tủ khóa thông minh Lockship tại Quận Ninh Kiều, TP. Cần Thơ"
                        title="Bản Đồ Mạng Lưới Smart Locker Box (GIS Interactive Map)"
                    >
                        <div className="space-y-6">
                            {/* Filter Bar & Quick Stats */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-400">Lọc theo trạng thái:</span>
                                    <div className="inline-flex rounded-xl border border-white/10 bg-slate-950 p-1">
                                        {[
                                            { id: 'ALL', label: 'Tất cả (3)' },
                                            { id: 'Available', label: 'Sẵn sàng (1)', color: 'text-emerald-400' },
                                            { id: 'Locked', label: 'Đã khóa (1)', color: 'text-rose-400' },
                                            { id: 'Unlocked', label: 'Đang mở (1)', color: 'text-cyan-400' },
                                        ].map((tab) => (
                                            <button
                                                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                                                    boxFilter === tab.id
                                                        ? 'bg-white/10 text-white shadow-sm'
                                                        : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                                key={tab.id}
                                                onClick={() => setBoxFilter(tab.id)}
                                                type="button"
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="text-xs text-slate-400 flex items-center gap-2">
                                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                                    <span>Tự động đồng bộ với ghim bản đồ</span>
                                </div>
                            </div>

                            {/* Interactive GIS Map Picker with the 3 Boxes */}
                            <InteractiveMapPicker
                                height="380px"
                                label={selectedBox ? selectedBox.name : 'Vị trí trạm tủ khóa'}
                                lat={mapCenter.lat}
                                lng={mapCenter.lng}
                                onLocationChange={(loc) => {
                                    setMapCenter({ lat: loc.lat, lng: loc.lng })
                                }}
                                onSelectBox={handleSelectBox}
                                selectedBoxId={selectedBox?.id}
                                showBoxes={true}
                                zoom={13}
                            />

                            {/* 3 Smart Locker Boxes Cards Grid */}
                            <div className="grid gap-4 md:grid-cols-3">
                                {filteredBoxes.map((box) => {
                                    const isSelected = selectedBox?.id === box.id
                                    return (
                                        <div
                                            className={`group relative cursor-pointer rounded-2xl border p-5 transition-all duration-300 ${
                                                isSelected
                                                    ? 'border-cyan-400/60 bg-gradient-to-b from-cyan-950/30 to-slate-900/90 shadow-[0_0_24px_rgba(6,182,212,0.15)] ring-1 ring-cyan-400/40'
                                                    : 'border-white/10 bg-slate-900/50 hover:border-white/20 hover:bg-slate-900/80'
                                            }`}
                                            key={box.id}
                                            onClick={() => handleSelectBox(box)}
                                        >
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                                                            {box.code}
                                                        </span>
                                                        {isSelected && (
                                                            <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">
                                                                Đang chọn
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="mt-1 text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                                                        {box.name}
                                                    </h3>
                                                </div>

                                                {/* Status Pill */}
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${
                                                        box.status === 'Available'
                                                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                                            : box.status === 'Locked'
                                                            ? 'border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                                                            : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                                                    }`}
                                                >
                                                    {box.status === 'Available' ? (
                                                        <CheckCircle2 size={13} />
                                                    ) : box.status === 'Locked' ? (
                                                        <Lock size={13} />
                                                    ) : (
                                                        <Unlock size={13} />
                                                    )}
                                                    {box.status}
                                                </span>
                                            </div>

                                            {/* Address & GPS */}
                                            <div className="mt-3 flex items-start gap-2 text-xs text-slate-300">
                                                <MapPin className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                                                <p className="line-clamp-2 leading-relaxed">{box.address}</p>
                                            </div>

                                            <p className="mt-2 text-[11px] font-mono text-cyan-400/80">
                                                GPS: {box.lat.toFixed(4)}° N, {box.lon.toFixed(4)}° E
                                            </p>

                                            {/* Compartments Breakdown */}
                                            <div className="mt-4 rounded-xl border border-white/5 bg-slate-950/60 p-3">
                                                <div className="flex items-center justify-between text-xs mb-2">
                                                    <span className="text-slate-400">Hộc trống khả dụng:</span>
                                                    <strong className="text-emerald-400 font-bold">
                                                        {box.availableCompartments} / {box.totalCompartments}
                                                    </strong>
                                                </div>

                                                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                                                    <div className="rounded-lg bg-white/[0.03] p-1.5 border border-white/5">
                                                        <span className="text-slate-400 block font-semibold">Size S</span>
                                                        <span className="text-white font-mono font-bold">{box.slots.S.available} trống</span>
                                                    </div>
                                                    <div className="rounded-lg bg-white/[0.03] p-1.5 border border-white/5">
                                                        <span className="text-slate-400 block font-semibold">Size M</span>
                                                        <span className="text-white font-mono font-bold">{box.slots.M.available} trống</span>
                                                    </div>
                                                    <div className="rounded-lg bg-white/[0.03] p-1.5 border border-white/5">
                                                        <span className="text-slate-400 block font-semibold">Size L</span>
                                                        <span className="text-white font-mono font-bold">{box.slots.L.available} trống</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Battery & Action Footer */}
                                            <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                                                <span className="inline-flex items-center gap-1.5 text-slate-400 font-mono">
                                                    <BatteryMedium size={14} className={box.battery > 50 ? 'text-emerald-400' : 'text-amber-400'} />
                                                    Pin: {box.battery}%
                                                </span>

                                                <button
                                                    className="inline-flex items-center gap-1 font-semibold text-cyan-400 hover:text-cyan-300 group-hover:underline"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleSelectBox(box)
                                                    }}
                                                    type="button"
                                                >
                                                    Xem vị trí →
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Active Selected Box Drawer HUD */}
                            {selectedBox && (
                                <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-xl">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="grid size-11 place-items-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                                                <Box size={22} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-bold text-white">{selectedBox.name}</h4>
                                                    <span className="font-mono text-xs text-cyan-300">({selectedBox.code})</span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5">{selectedBox.address}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Link
                                                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-950/30 transition no-underline active:scale-95"
                                                to={`/owner/deliveries/new?box=${selectedBox.id}`}
                                            >
                                                <Sparkles size={14} />
                                                Tạo đơn giao đến Box này
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Original Vehicle Locks List */}
                    <Card
                        description="Trạng thái thiết bị IoT theo thời gian thực và dữ liệu telemetry gần nhất"
                        title="Danh sách Thiết bị IoT Gắn Xe"
                    >
                        <label className="relative mb-5 block max-w-sm">
                            <span className="sr-only">Tìm thiết bị hoặc biển số phương tiện</span>
                            <Search aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                            <input
                                aria-label="Tìm thiết bị hoặc biển số phương tiện"
                                className="ui-control w-full pl-10"
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Tìm thiết bị hoặc phương tiện"
                                type="search"
                                value={search}
                            />
                        </label>
                        {visible.length === 0 ? (
                            <EmptyState
                                description={devices.length ? 'Hãy thử mã thiết bị hoặc biển số phương tiện khác.' : 'Thiết bị IoT được liên kết với phương tiện sẽ hiển thị tại đây.'}
                                title={devices.length ? 'Không tìm thấy thiết bị phù hợp' : 'Chưa có khóa thông minh được kết nối'}
                            />
                        ) : (
                            <>
                                <div className="hidden overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md md:block">
                                    <table className="w-full min-w-[50rem] text-left text-sm text-slate-200">
                                        <thead className="border-b border-white/10 bg-white/[0.03] text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                            <tr>
                                                <th className="px-5 py-3.5">Thiết bị</th>
                                                <th className="px-5 py-3.5">Phương tiện</th>
                                                <th className="px-5 py-3.5">Kết nối</th>
                                                <th className="px-5 py-3.5">Trạng thái khóa</th>
                                                <th className="px-5 py-3.5">Pin</th>
                                                <th className="px-5 py-3.5">Hoạt động lần cuối</th>
                                                <th className="px-5 py-3.5" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {visible.map((device) => (
                                                <tr className="transition hover:bg-white/[0.04]" key={device._id}>
                                                    <td className="px-5 py-4 font-mono text-xs font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]">
                                                        {device.deviceId}
                                                    </td>
                                                    <td className="px-5 py-4 text-slate-200">
                                                        {vehicles.find((vehicle) => vehicle._id === device.vehicleId)?.plateNumber || 'Phương tiện'}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <StatusPill value={device.status} />
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <StatusPill value={device.lockStatus} />
                                                    </td>
                                                    <td className="px-5 py-4 font-mono text-xs text-slate-300">
                                                        {device.battery == null ? '—' : `${device.battery}%`}
                                                    </td>
                                                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-400">
                                                        {formatDate(device.lastSeen)}
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <Link
                                                            className="text-xs font-semibold text-cyan-400 no-underline hover:text-cyan-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                                                            to={`/owner/locks/${device._id}`}
                                                        >
                                                            Chi tiết →
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="grid gap-3 md:hidden">
                                    {visible.map((device) => (
                                        <Link
                                            className="spatial-card block p-4 text-inherit no-underline transition hover:border-cyan-400/40"
                                            key={device._id}
                                            to={`/owner/locks/${device._id}`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="break-all font-mono text-xs font-bold text-cyan-300">{device.deviceId}</p>
                                                    <p className="mt-1 text-xs text-slate-400">
                                                        {vehicles.find((vehicle) => vehicle._id === device.vehicleId)?.plateNumber || 'Phương tiện'}
                                                    </p>
                                                </div>
                                                <StatusPill value={device.status} />
                                            </div>
                                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                                <StatusPill value={device.lockStatus} />
                                                <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-400">
                                                    <BatteryMedium size={14} />
                                                    {device.battery == null ? '—' : `${device.battery}%`}
                                                </span>
                                            </div>
                                            <p className="mt-3 text-xs text-slate-500">Hoạt động lần cuối {formatDate(device.lastSeen)}</p>
                                        </Link>
                                    ))}
                                </div>
                            </>
                        )}
                    </Card>
                </>
            )}
        </OwnerPage>
    )
}

