import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Car,
    Plus,
    Search,
    Cpu,
    ShieldCheck,
    AlertCircle,
    ArrowRight,
    RotateCw,
    X
} from 'lucide-react'
import OwnerPage from '../../components/OwnerPage.jsx'
import { OwnerError, OwnerLoading } from '../../components/OwnerFeedback.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import { vehicleApi } from '../../services/ownerApi.js'

export default function OwnerVehiclePage() {
    const [vehicles, setVehicle] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const refresh = useCallback(async () => {
        setError('')
        try {
            const data = await vehicleApi.list()
            setVehicle(Array.isArray(data) ? data : [])
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
                const data = await vehicleApi.list()
                if (active) setVehicle(Array.isArray(data) ? data : [])
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

    const stats = useMemo(() => {
        const total = vehicles.length
        const active = vehicles.filter((v) => v.status === 'active').length
        const withIot = vehicles.filter((v) => Boolean(v.iotDeviceId)).length
        const withoutIot = total - withIot
        return { total, active, withIot, withoutIot }
    }, [vehicles])

    const filteredVehicles = useMemo(() => {
        return vehicles.filter((v) => {
            if (statusFilter !== 'all' && v.status !== statusFilter) return false
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase()
                const plate = (v.plateNumber || '').toLowerCase()
                const type = (v.type || '').toLowerCase()
                const model = (v.model || '').toLowerCase()
                const iot = (v.iotDeviceId || '').toLowerCase()
                if (!plate.includes(term) && !type.includes(term) && !model.includes(term) && !iot.includes(term)) {
                    return false
                }
            }
            return true
        })
    }, [vehicles, statusFilter, searchTerm])

    return (
        <OwnerPage
            eyebrow="Quản lý đội xe"
            title="Phương tiện vận chuyển"
            description="Giám sát đội xe trực thuộc doanh nghiệp, trạng thái hoạt động và các thiết bị khóa IoT đã gắn."
            action="/owner/vehicles/create"
        >
            <OwnerError error={error} onRetry={refresh} />

            {loading ? (
                <OwnerLoading label="Đang tải danh sách phương tiện..." />
            ) : (
                <div className="space-y-6">
                    {/* Bento Metrics */}
                    <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <Card className="flex items-center gap-4 p-4 border-white/10 bg-slate-900/40">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                <Car className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng số xe</p>
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
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                <Cpu className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Đã gắn khóa IoT</p>
                                <p className="mt-0.5 text-2xl font-black text-blue-400">{stats.withIot}</p>
                            </div>
                        </Card>

                        <Card className="flex items-center gap-4 p-4 border-white/10 bg-slate-900/40">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Chưa gắn khóa</p>
                                <p className="mt-0.5 text-2xl font-black text-amber-400">{stats.withoutIot}</p>
                            </div>
                        </Card>
                    </section>

                    {/* Filter Bar */}
                    <Card className="p-4 border-white/10 bg-slate-900/40">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-9 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Tìm biển số, mẫu xe, mã IoT..."
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
                        </div>
                    </Card>

                    {/* Table */}
                    {filteredVehicles.length === 0 ? (
                        <Card className="p-12 text-center border-dashed border-white/10 bg-slate-900/20">
                            <Car className="mx-auto h-10 w-10 text-slate-600 mb-3" />
                            <p className="text-sm font-semibold text-slate-300">Không tìm thấy phương tiện nào</p>
                            <p className="text-xs text-slate-500 mt-1">Đăng ký phương tiện mới để bắt đầu gán vào các đơn hàng</p>
                            <div className="mt-4">
                                <Link
                                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 transition"
                                    to="/owner/vehicles/create"
                                >
                                    <Plus className="h-4 w-4" />
                                    Thêm phương tiện mới
                                </Link>
                            </div>
                        </Card>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                            <table className="w-full min-w-[50rem] text-left text-sm">
                                <thead className="border-b border-white/10 bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="px-5 py-3.5">Biển số</th>
                                        <th className="px-5 py-3.5">Loại & Model</th>
                                        <th className="px-5 py-3.5">Thiết bị IoT gắn kèm</th>
                                        <th className="px-5 py-3.5">Trạng thái</th>
                                        <th className="px-5 py-3.5 text-right">Chi tiết</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredVehicles.map((vehicle) => (
                                        <tr className="hover:bg-white/[0.02] transition" key={vehicle._id}>
                                            <td className="px-5 py-3.5 font-mono text-sm font-bold text-white">
                                                {vehicle.plateNumber}
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-slate-300">
                                                <span className="font-semibold text-white">{vehicle.type}</span>
                                                {vehicle.model && <span className="text-slate-400"> · {vehicle.model}</span>}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {vehicle.iotDeviceId ? (
                                                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-cyan-400">
                                                        <Cpu className="h-3.5 w-3.5" />
                                                        {vehicle.iotDeviceId}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-500 italic">Chưa gắn khóa</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <StatusPill value={vehicle.status} />
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <Link
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
                                                    to={`/owner/vehicles/${vehicle._id}`}
                                                >
                                                    Cập nhật
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </OwnerPage>
    )
}