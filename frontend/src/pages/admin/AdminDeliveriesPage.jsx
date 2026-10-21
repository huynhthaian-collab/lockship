import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Eye, MapPin, Package, RefreshCw, Search, ShieldCheck, X } from 'lucide-react'
import AdminPage from '../../components/AdminPage.jsx'
import ErrorMessage from '../../components/ErrorMessage.jsx'
import Loading from '../../components/Loading.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import Card from '../../components/ui/Card.jsx'
import Table from '../../components/ui/Table.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import { adminApi } from '../../services/adminApi.js'

function formatDate(value) {
    return value ? new Date(value).toLocaleString('vi-VN') : '—'
}

export default function AdminDeliveryPage() {
    const [deliveries, setDelivery] = useState([])
    const [users, setUser] = useState([])
    const [vehicles, setVehicle] = useState([])
    const [filter, setFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDelivery, setSelectedDelivery] = useState(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const refresh = useCallback(async (isSilent = false) => {
        if (!isSilent) setError('')
        setRefreshing(true)
        try {
            const [allDelivery, allUser, allVehicle] = await Promise.all([
                adminApi.deliveries().catch(() => []),
                adminApi.users().catch(() => []),
                adminApi.vehicles().catch(() => []),
            ])
            setDelivery(Array.isArray(allDelivery) ? allDelivery : [])
            setUser(Array.isArray(allUser) ? allUser : [])
            setVehicle(Array.isArray(allVehicle) ? allVehicle : [])
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải danh sách đơn giao hàng.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        let active = true
        async function init() {
            try {
                const [allDelivery, allUser, allVehicle] = await Promise.all([
                    adminApi.deliveries().catch(() => []),
                    adminApi.users().catch(() => []),
                    adminApi.vehicles().catch(() => []),
                ])
                if (active) {
                    setDelivery(Array.isArray(allDelivery) ? allDelivery : [])
                    setUser(Array.isArray(allUser) ? allUser : [])
                    setVehicle(Array.isArray(allVehicle) ? allVehicle : [])
                    setLoading(false)
                }
            } catch (err) {
                if (active) {
                    setError(err.message || 'Không thể tải danh sách đơn giao hàng.')
                    setLoading(false)
                }
            }
        }
        init()
        return () => { active = false }
    }, [])

    const onLiveEvent = useCallback(() => {
        refresh(true)
    }, [refresh])

    useSocketEvent('delivery:arrived', onLiveEvent)
    useSocketEvent('unlock:success', onLiveEvent)
    useSocketEvent('unlock:failed', onLiveEvent)

    const userMap = useMemo(() => new Map(users.map((u) => [u._id, u])), [users])
    const vehicleMap = useMemo(() => new Map(vehicles.map((v) => [v._id, v])), [vehicles])

    const filteredDelivery = useMemo(() => {
        return deliveries.filter((item) => {
            if (filter !== 'all' && item.status !== filter) return false
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase()
                const id = (item._id || '').toLowerCase()
                const pickup = (item.pickupAddress || '').toLowerCase()
                const dropoff = (item.deliveryAddress || '').toLowerCase()
                const owner = userMap.get(item.ownerId)
                const ownerName = (owner?.name || '').toLowerCase()
                const shipper = userMap.get(item.shipperId)
                const shipperName = (shipper?.name || '').toLowerCase()
                const vehicle = vehicleMap.get(item.vehicleId)
                const plate = (vehicle?.plateNumber || '').toLowerCase()

                if (
                    !id.includes(term) &&
                    !pickup.includes(term) &&
                    !dropoff.includes(term) &&
                    !ownerName.includes(term) &&
                    !shipperName.includes(term) &&
                    !plate.includes(term)
                ) {
                    return false
                }
            }
            return true
        })
    }, [deliveries, filter, searchTerm, userMap, vehicleMap])

    const statusCounts = useMemo(() => {
        const counts = { all: deliveries.length }
        for (const item of deliveries) {
            counts[item.status] = (counts[item.status] || 0) + 1
        }
        return counts
    }, [deliveries])

    return (
        <AdminPage
            eyebrow="Kiểm tra hệ thống"
            title="Quản lý đơn giao hàng"
            description="Toàn bộ đơn giao hàng trong hệ thống: theo dõi phân công, xác minh lộ trình và trạng thái mở khóa an toàn."
            action={
                <button
                    className="ui-button-secondary gap-1.5 px-3.5 py-1.5 text-xs font-semibold"
                    disabled={refreshing}
                    onClick={() => refresh()}
                    type="button"
                >
                    <RefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
                    {refreshing ? 'Đang cập nhật...' : 'Làm mới'}
                </button>
            }
        >
            {error && <ErrorMessage message={error} />}

            {/* Filter and Search Bar */}
            <Card className="p-4 sm:p-5" bodyClassName="p-0">
                <div className="flex flex-col gap-4 p-4 sm:p-5">
                    <div className="relative max-w-md">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                        <input
                            aria-label="Tìm kiếm đơn giao hàng"
                            className="ui-control pl-10 pr-9 text-xs sm:text-sm"
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm theo mã đơn, địa chỉ, chủ xe, shipper, biển số..."
                            type="search"
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

                    <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5">
                        {[
                            ['all', 'Tất cả'],
                            ['pending', 'Đang chờ'],
                            ['assigned', 'Đã phân công'],
                            ['accepted', 'Đã tiếp nhận'],
                            ['in-progress', 'Đang thực hiện'],
                            ['arrived', 'Đã đến nơi'],
                            ['authorized', 'Đã cấp quyền'],
                            ['completed', 'Đã hoàn tất'],
                            ['cancelled', 'Đã hủy'],
                        ].map(([statusKey, label]) => {
                            const count = statusCounts[statusKey] || 0
                            const isActive = filter === statusKey
                            return (
                                <button
                                    key={statusKey}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                                        isActive
                                            ? 'border border-cyan-400/50 bg-cyan-500/20 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                                            : 'border border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-white'
                                    }`}
                                    onClick={() => setFilter(statusKey)}
                                    type="button"
                                >
                                    <span>{label}</span>
                                    <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] font-mono opacity-80">
                                        {count}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </Card>

            {/* Deliveries Table */}
            {loading ? (
                <Loading label="Đang tải dữ liệu giám sát đơn giao hàng..." />
            ) : filteredDelivery.length === 0 ? (
                <Card>
                    <EmptyState
                        title={deliveries.length ? 'Không tìm thấy đơn phù hợp' : 'Chưa có đơn giao hàng'}
                        description={deliveries.length ? 'Hãy thử điều chỉnh từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác.' : 'Đơn giao hàng mới sẽ hiển thị tại đây khi chủ sở hữu khởi tạo.'}
                    />
                </Card>
            ) : (
                <>
                    <Card
                        title="Danh sách đơn giao hàng"
                        description={`Hiển thị ${filteredDelivery.length} trên tổng số ${deliveries.length} đơn`}
                        bodyClassName="p-0"
                    >
                        <div className="hidden md:block overflow-x-auto">
                            <Table className="min-w-[65rem]">
                                <thead className="border-b border-white/10 bg-white/[0.03] text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="px-5 py-3.5">Mã đơn</th>
                                        <th className="px-5 py-3.5">Chủ sở hữu</th>
                                        <th className="px-5 py-3.5">Nhân viên giao hàng</th>
                                        <th className="px-5 py-3.5">Phương tiện</th>
                                        <th className="px-5 py-3.5">Lộ trình giao hàng</th>
                                        <th className="px-5 py-3.5">Trạng thái</th>
                                        <th className="px-5 py-3.5">Chốt mở khóa</th>
                                        <th className="px-5 py-3.5 text-right">Chi tiết</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredDelivery.map((item) => {
                                        const owner = userMap.get(item.ownerId)
                                        const shipper = userMap.get(item.shipperId)
                                        const vehicle = vehicleMap.get(item.vehicleId)

                                        return (
                                            <tr className="transition hover:bg-white/[0.04]" key={item._id}>
                                                <td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]">
                                                    #{item._id ? item._id.slice(-8).toUpperCase() : '—'}
                                                </td>
                                                <td className="px-5 py-4 text-xs">
                                                    {owner ? (
                                                        <Link to={`/admin/users/${owner._id}`} className="font-semibold text-white hover:text-cyan-300 hover:underline">
                                                            {owner.name}
                                                        </Link>
                                                    ) : (
                                                        <span className="font-mono text-slate-400">{item.ownerId ? `#${item.ownerId.slice(-6)}` : '—'}</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-xs">
                                                    {shipper ? (
                                                        <div>
                                                            <Link to={`/admin/users/${shipper._id}`} className="font-semibold text-white hover:text-cyan-300 hover:underline">
                                                                {shipper.name}
                                                            </Link>
                                                            {shipper.phone && <p className="text-[11px] font-mono text-slate-400">{shipper.phone}</p>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-amber-400/90 text-xs italic">Chưa phân công</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-xs">
                                                    {vehicle ? (
                                                        <div className="font-mono">
                                                            <span className="font-bold text-slate-200">{vehicle.plateNumber}</span>
                                                            <p className="text-[11px] text-slate-400">{vehicle.model}</p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-500">—</span>
                                                    )}
                                                </td>
                                                <td className="max-w-xs px-5 py-4 text-xs text-slate-300">
                                                    <p className="truncate font-medium text-white">{item.pickupAddress}</p>
                                                    <p className="truncate text-slate-400 text-[11px]">→ {item.deliveryAddress}</p>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <StatusPill value={item.status} />
                                                </td>
                                                <td className="px-5 py-4">
                                                    <StatusPill value={item.unlockStatus || 'pending'} />
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <button
                                                        className="ui-button-secondary px-3 py-1.5 text-xs font-semibold"
                                                        onClick={() => setSelectedDelivery(item)}
                                                        type="button"
                                                    >
                                                        Kiểm tra
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </Table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="grid gap-3 p-4 md:hidden">
                            {filteredDelivery.map((item) => {
                                const owner = userMap.get(item.ownerId)
                                const shipper = userMap.get(item.shipperId)
                                const vehicle = vehicleMap.get(item.vehicleId)
                                return (
                                    <div className="spatial-card p-4 space-y-3" key={item._id}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-mono text-xs font-bold text-cyan-300">
                                                    #{item._id ? item._id.slice(-8).toUpperCase() : ''}
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-400">{owner?.name || 'Không rõ chủ xe'}</p>
                                            </div>
                                            <StatusPill value={item.status} />
                                        </div>
                                        <p className="line-clamp-2 text-xs text-slate-300">{item.pickupAddress} → {item.deliveryAddress}</p>
                                        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
                                            <span>{shipper?.name || 'Chưa có shipper'} · {vehicle?.plateNumber || 'Chưa xe'}</span>
                                            <button className="text-xs font-semibold text-cyan-400" onClick={() => setSelectedDelivery(item)} type="button">
                                                Kiểm tra →
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </Card>
                </>
            )}

            {/* Modal Kiểm tra chi tiết đơn giao hàng */}
            {selectedDelivery && (
                <Modal
                    description={`Mã đơn hệ thống · ${selectedDelivery._id}`}
                    footer={
                        <Button onClick={() => setSelectedDelivery(null)} type="button" variant="secondary">
                            Đóng cửa sổ
                        </Button>
                    }
                    onClose={() => setSelectedDelivery(null)}
                    open={Boolean(selectedDelivery)}
                    size="xl"
                    title="Dữ liệu và các mốc giao hàng an toàn"
                >
                    <div className="max-h-[70vh] space-y-5 overflow-y-auto text-sm pr-1">
                        <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                            <div>
                                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Trạng thái đơn hàng</p>
                                <div className="mt-1.5"><StatusPill value={selectedDelivery.status} /></div>
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Trạng thái chốt khóa IoT</p>
                                <div className="mt-1.5"><StatusPill value={selectedDelivery.unlockStatus || 'pending'} /></div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wide">Chi tiết lộ trình</h4>
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs space-y-2">
                                <p><span className="font-semibold text-slate-400">Điểm lấy hàng:</span> <span className="text-white">{selectedDelivery.pickupAddress}</span></p>
                                <p><span className="font-semibold text-slate-400">Điểm đến:</span> <span className="text-white">{selectedDelivery.deliveryAddress}</span></p>
                                {selectedDelivery.description && (
                                    <p><span className="font-semibold text-slate-400">Ghi chú vận chuyển:</span> <span className="text-slate-300">{selectedDelivery.description}</span></p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wide">Thời điểm các mốc vận hành</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                    <p className="text-slate-400 font-semibold text-[11px]">Đã tạo</p>
                                    <p className="mt-1 font-mono text-slate-200 text-xs">{formatDate(selectedDelivery.createdAt)}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                    <p className="text-slate-400 font-semibold text-[11px]">Đã phân công</p>
                                    <p className="mt-1 font-mono text-slate-200 text-xs">{formatDate(selectedDelivery.assignedAt)}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                    <p className="text-slate-400 font-semibold text-[11px]">Đã tiếp nhận</p>
                                    <p className="mt-1 font-mono text-slate-200 text-xs">{formatDate(selectedDelivery.acceptedAt)}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                    <p className="text-slate-400 font-semibold text-[11px]">Bắt đầu giao</p>
                                    <p className="mt-1 font-mono text-slate-200 text-xs">{formatDate(selectedDelivery.startedAt)}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                    <p className="text-slate-400 font-semibold text-[11px]">Đến điểm giao</p>
                                    <p className="mt-1 font-mono text-slate-200 text-xs">{formatDate(selectedDelivery.arrivedAt)}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                    <p className="text-slate-400 font-semibold text-[11px]">Cấp quyền mở khóa</p>
                                    <p className="mt-1 font-mono text-slate-200 text-xs">{formatDate(selectedDelivery.authorizedAt)}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                    <p className="text-slate-400 font-semibold text-[11px]">Đã hoàn tất</p>
                                    <p className="mt-1 font-mono text-emerald-400 text-xs">{formatDate(selectedDelivery.completedAt)}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                    <p className="text-slate-400 font-semibold text-[11px]">Đã hủy</p>
                                    <p className="mt-1 font-mono text-rose-400 text-xs">{formatDate(selectedDelivery.cancelledAt)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </AdminPage>
    )
}