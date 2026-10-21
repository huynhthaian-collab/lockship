import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Car,
    Cpu,
    Search,
    Edit2,
    Trash2,
    CheckCircle2,
    X,
    Save,
    RotateCw,
    ShieldCheck,
    AlertCircle
} from 'lucide-react'
import AdminPage from '../../components/AdminPage.jsx'
import Card from '../../components/ui/Card.jsx'
import ErrorMessage from '../../components/ErrorMessage.jsx'
import Loading from '../../components/Loading.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import { adminApi } from '../../services/adminApi.js'

export default function AdminVehiclePage() {
    const [vehicles, setVehicle] = useState([])
    const [owners, setOwners] = useState([])
    const [devices, setDevices] = useState([])
    const [editingId, setEditingId] = useState('')
    const [form, setForm] = useState({ plateNumber: '', type: '', model: '', status: 'active', ownerId: '', iotDeviceId: '' })
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [iotFilter, setIotFilter] = useState('all')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)

    const refresh = useCallback(async () => {
        setError('')
        try {
            const [allVehicle, allUser, allDevices] = await Promise.all([
                adminApi.vehicles(),
                adminApi.users(),
                adminApi.devices().catch(() => []),
            ])
            setVehicle(Array.isArray(allVehicle) ? allVehicle : [])
            setOwners(Array.isArray(allUser) ? allUser.filter((user) => user.role === 'owner') : [])
            setDevices(Array.isArray(allDevices) ? allDevices : [])
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải danh sách phương tiện')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        let active = true
        async function fetchInitial() {
            try {
                const [allVehicle, allUser, allDevices] = await Promise.all([
                    adminApi.vehicles(),
                    adminApi.users(),
                    adminApi.devices().catch(() => []),
                ])
                if (!active) return
                setVehicle(Array.isArray(allVehicle) ? allVehicle : [])
                setOwners(Array.isArray(allUser) ? allUser.filter((user) => user.role === 'owner') : [])
                setDevices(Array.isArray(allDevices) ? allDevices : [])
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

    const ownerMap = useMemo(() => new Map(owners.map((o) => [o._id, o])), [owners])
    const deviceMap = useMemo(() => new Map(devices.map((d) => [d.deviceId, d])), [devices])

    const stats = useMemo(() => {
        const total = vehicles.length
        const active = vehicles.filter((v) => v.status === 'active').length
        const withIot = vehicles.filter((v) => Boolean(v.iotDeviceId)).length
        const withoutIot = total - withIot
        return { total, active, withIot, withoutIot }
    }, [vehicles])

    const filteredVehicle = useMemo(() => {
        return vehicles.filter((vehicle) => {
            if (statusFilter !== 'all' && vehicle.status !== statusFilter) return false
            if (iotFilter === 'with_iot' && !vehicle.iotDeviceId) return false
            if (iotFilter === 'without_iot' && vehicle.iotDeviceId) return false

            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase()
                const plate = (vehicle.plateNumber || '').toLowerCase()
                const model = (vehicle.model || '').toLowerCase()
                const type = (vehicle.type || '').toLowerCase()
                const owner = ownerMap.get(vehicle.ownerId)
                const ownerName = (owner?.name || '').toLowerCase()
                const ownerEmail = (owner?.email || '').toLowerCase()
                const deviceId = (vehicle.iotDeviceId || '').toLowerCase()

                if (
                    !plate.includes(term) &&
                    !model.includes(term) &&
                    !type.includes(term) &&
                    !ownerName.includes(term) &&
                    !ownerEmail.includes(term) &&
                    !deviceId.includes(term)
                ) {
                    return false
                }
            }
            return true
        })
    }, [vehicles, statusFilter, iotFilter, searchTerm, ownerMap])

    function startEdit(vehicle) {
        setEditingId(vehicle._id)
        setForm({
            plateNumber: vehicle.plateNumber || '',
            type: vehicle.type || '',
            model: vehicle.model || '',
            status: vehicle.status || 'active',
            ownerId: vehicle.ownerId || '',
            iotDeviceId: vehicle.iotDeviceId || '',
        })
        setError('')
        setNotice('')
    }

    async function save(id) {
        if (busy) return
        setBusy(true)
        setError('')
        setNotice('')
        try {
            const payload = {
                plateNumber: form.plateNumber.trim().toUpperCase(),
                type: form.type.trim(),
                model: form.model.trim(),
                status: form.status,
                ownerId: form.ownerId,
                iotDeviceId: form.iotDeviceId.trim() || null,
            }
            await adminApi.updateVehicle(id, payload)
            setNotice(`Đã cập nhật phương tiện ${payload.plateNumber} thành công.`)
            setEditingId('')
            await refresh()
        } catch (requestError) {
            setError(requestError.message || 'Không thể lưu phương tiện')
        } finally {
            setBusy(false)
        }
    }

    async function remove(vehicle) {
        if (!window.confirm(`Xóa phương tiện ${vehicle.plateNumber}? Thao tác này không thể hoàn tác.`)) return
        setError('')
        setNotice('')
        try {
            await adminApi.deleteVehicle(vehicle._id)
            setNotice(`Đã xóa phương tiện ${vehicle.plateNumber}.`)
            await refresh()
        } catch (requestError) {
            setError(requestError.message || 'Không thể xóa phương tiện')
        }
    }

    return (
        <AdminPage
            eyebrow="Quản lý đội xe"
            title="Phương tiện vận chuyển"
            description="Giám sát toàn bộ đội xe hệ thống, liên kết thiết bị khóa IoT thông minh và phân quyền sở hữu phương tiện."
            action={
                <button
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-200 backdrop-blur-md hover:bg-white/10 hover:text-white transition"
                    onClick={() => refresh()}
                    type="button"
                >
                    <RotateCw className="h-3.5 w-3.5" />
                    Làm mới danh sách
                </button>
            }
        >
            {error && <ErrorMessage message={error} />}
            {notice && (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 backdrop-blur-md shadow-lg shadow-emerald-950/20" role="status">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{notice}</span>
                </div>
            )}

            {/* Bento Summary Stats */}
            <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="flex items-center gap-4 p-4 border-white/10 bg-slate-900/40">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <Car className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng phương tiện</p>
                        <p className="mt-0.5 text-2xl font-black text-white">{stats.total}</p>
                    </div>
                </Card>

                <Card className="flex items-center gap-4 p-4 border-white/10 bg-slate-900/40">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Đang hoạt động</p>
                        <p className="mt-0.5 text-2xl font-black text-emerald-400">{stats.active}</p>
                    </div>
                </Card>

                <Card className="flex items-center gap-4 p-4 border-white/10 bg-slate-900/40">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Cpu className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Đã gắn IoT</p>
                        <p className="mt-0.5 text-2xl font-black text-cyan-400">{stats.withIot}</p>
                    </div>
                </Card>

                <Card className="flex items-center gap-4 p-4 border-white/10 bg-slate-900/40">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Chưa gắn IoT</p>
                        <p className="mt-0.5 text-2xl font-black text-amber-400">{stats.withoutIot}</p>
                    </div>
                </Card>
            </section>

            {/* Filter and Search Bar */}
            <Card className="p-4 border-white/10 bg-slate-900/40">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-9 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition"
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Tìm biển số, mẫu xe, chủ sở hữu hoặc IoT..."
                            value={searchTerm}
                        />
                        {searchTerm && (
                            <button
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                onClick={() => setSearchTerm('')}
                                type="button"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-400">Trạng thái:</span>
                            <select
                                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs text-white focus:border-cyan-500/50 focus:outline-none"
                                onChange={(e) => setStatusFilter(e.target.value)}
                                value={statusFilter}
                            >
                                <option value="all">Tất cả trạng thái</option>
                                <option value="active">Đang hoạt động</option>
                                <option value="inactive">Không hoạt động</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-400">IoT:</span>
                            <select
                                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs text-white focus:border-cyan-500/50 focus:outline-none"
                                onChange={(e) => setIotFilter(e.target.value)}
                                value={iotFilter}
                            >
                                <option value="all">Tất cả phương tiện</option>
                                <option value="with_iot">Có thiết bị IoT</option>
                                <option value="without_iot">Không có thiết bị IoT</option>
                            </select>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Vehicle Table */}
            {loading ? (
                <Loading label="Đang tải danh sách phương tiện..." />
            ) : filteredVehicle.length === 0 ? (
                <Card className="p-12 text-center border-dashed border-white/10 bg-slate-900/20">
                    <Car className="mx-auto h-10 w-10 text-slate-600 mb-3" />
                    <p className="text-sm font-semibold text-slate-300">Không tìm thấy phương tiện phù hợp</p>
                    <p className="text-xs text-slate-500 mt-1">Hãy thử thay đổi từ khóa hoặc bộ lọc trạng thái</p>
                </Card>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                    <table className="w-full min-w-[65rem] text-left text-sm">
                        <thead className="border-b border-white/10 bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-slate-400">
                            <tr>
                                <th className="px-5 py-3.5">Biển số xe</th>
                                <th className="px-5 py-3.5">Loại & Model</th>
                                <th className="px-5 py-3.5">Chủ sở hữu đội xe</th>
                                <th className="px-5 py-3.5">Thiết bị IoT gắn kèm</th>
                                <th className="px-5 py-3.5">Trạng thái</th>
                                <th className="px-5 py-3.5 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredVehicle.map((vehicle) => {
                                const owner = ownerMap.get(vehicle.ownerId)
                                const device = vehicle.iotDeviceId ? deviceMap.get(vehicle.iotDeviceId) : null
                                const editing = editingId === vehicle._id

                                if (editing) {
                                    return (
                                        <tr key={vehicle._id} className="bg-cyan-500/10 border-cyan-500/30">
                                            <td className="px-5 py-3">
                                                <input
                                                    className="w-32 rounded-lg border border-cyan-500/50 bg-slate-950 px-2.5 py-1 text-sm font-mono font-bold uppercase text-white focus:outline-none"
                                                    maxLength={20}
                                                    onChange={(event) => setForm({ ...form, plateNumber: event.target.value })}
                                                    required
                                                    value={form.plateNumber}
                                                />
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex gap-2">
                                                    <input
                                                        aria-label="Loại phương tiện"
                                                        className="w-24 rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                                                        maxLength={50}
                                                        onChange={(event) => setForm({ ...form, type: event.target.value })}
                                                        placeholder="Loại xe"
                                                        value={form.type}
                                                    />
                                                    <input
                                                        aria-label="Mẫu phương tiện"
                                                        className="w-28 rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                                                        maxLength={100}
                                                        onChange={(event) => setForm({ ...form, model: event.target.value })}
                                                        placeholder="Model"
                                                        value={form.model}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <select
                                                    aria-label="Chủ sở hữu phương tiện"
                                                    className="max-w-48 rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1 text-xs text-white focus:outline-none"
                                                    onChange={(event) => setForm({ ...form, ownerId: event.target.value })}
                                                    value={form.ownerId}
                                                >
                                                    {owners.map((item) => (
                                                        <option key={item._id} value={item._id}>
                                                            {item.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-5 py-3">
                                                <input
                                                    aria-label="Mã thiết bị IoT"
                                                    className="w-36 rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1 text-xs font-mono text-white placeholder-slate-500 focus:outline-none"
                                                    maxLength={100}
                                                    onChange={(event) => setForm({ ...form, iotDeviceId: event.target.value })}
                                                    placeholder="Không gắn IoT"
                                                    value={form.iotDeviceId}
                                                />
                                            </td>
                                            <td className="px-5 py-3">
                                                <select
                                                    aria-label="Trạng thái phương tiện"
                                                    className="rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white focus:outline-none"
                                                    onChange={(event) => setForm({ ...form, status: event.target.value })}
                                                    value={form.status}
                                                >
                                                    <option value="active">Đang hoạt động</option>
                                                    <option value="inactive">Không hoạt động</option>
                                                </select>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition disabled:opacity-50"
                                                        disabled={busy}
                                                        onClick={() => save(vehicle._id)}
                                                        type="button"
                                                    >
                                                        <Save className="h-3.5 w-3.5" />
                                                        {busy ? 'Đang lưu...' : 'Lưu'}
                                                    </button>
                                                    <button
                                                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-300"
                                                        onClick={() => setEditingId('')}
                                                        type="button"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                        Hủy
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                }

                                return (
                                    <tr className="hover:bg-white/[0.02] transition" key={vehicle._id}>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                    <Car className="h-4 w-4" />
                                                </div>
                                                <span className="font-mono text-sm font-bold text-white tracking-wide">
                                                    {vehicle.plateNumber || '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs text-slate-300">
                                            <span className="font-semibold text-white">{vehicle.type || 'Chưa phân loại'}</span>
                                            {vehicle.model && <span className="text-slate-400"> • {vehicle.model}</span>}
                                        </td>
                                        <td className="px-5 py-3.5 text-xs">
                                            {owner ? (
                                                <Link to={`/admin/users/${owner._id}`} className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline">
                                                    {owner.name}
                                                </Link>
                                            ) : (
                                                <span className="font-mono text-slate-500">{vehicle.ownerId ? vehicle.ownerId.slice(-6) : 'Chưa gán'}</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {vehicle.iotDeviceId ? (
                                                <div className="flex items-center gap-2">
                                                    {device ? (
                                                        <Link
                                                            to={`/admin/iot/${device._id}`}
                                                            className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline"
                                                        >
                                                            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                                                            {vehicle.iotDeviceId}
                                                        </Link>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-300">
                                                            <Cpu className="h-3.5 w-3.5 text-slate-400" />
                                                            {vehicle.iotDeviceId}
                                                        </span>
                                                    )}
                                                    {device && <StatusPill value={device.status} />}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-500 italic">Chưa gắn khóa</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <StatusPill value={vehicle.status} />
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition"
                                                    onClick={() => startEdit(vehicle)}
                                                    type="button"
                                                >
                                                    <Edit2 className="h-3 w-3" />
                                                    Sửa
                                                </button>
                                                <button
                                                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-400 hover:bg-red-500/20 transition"
                                                    onClick={() => remove(vehicle)}
                                                    type="button"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                    Xóa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </AdminPage>
    )
}