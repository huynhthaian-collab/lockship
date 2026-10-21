import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import DeliveryCard from './DeliveryCard.jsx'
import DeliveryStatus from './DeliveryStatus.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import Pagination from '../ui/Pagination.jsx'
import Skeleton from '../ui/Skeleton.jsx'
import Table from '../ui/Table.jsx'

const pageSize = 8
const deliveryStatusLabels = {
  all: 'Tất cả trạng thái',
  active: 'Đang hoạt động',
  pending: 'Đang chờ',
  assigned: 'Đã phân công',
  accepted: 'Đã tiếp nhận',
  arrived: 'Đã đến nơi',
  authorized: 'Đã cấp quyền',
  'in-progress': 'Đang thực hiện',
  completed: 'Đã hoàn tất',
  cancelled: 'Đã hủy',
}

function matchesDate(value, start, end) {
  if (!start && !end) return true
  const timestamp = value ? new Date(value).getTime() : Number.NaN
  if (!Number.isFinite(timestamp)) return false
  if (start && timestamp < new Date(`${start}T00:00:00`).getTime()) return false
  if (end && timestamp > new Date(`${end}T23:59:59.999`).getTime()) return false
  return true
}

export default function DeliveryList({ deliveries = [], role, loading, statusOptions = [], shippers = [], vehicles = [] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState(role === 'shipper' ? 'active' : 'all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)

  const safeDeliveries = Array.isArray(deliveries) ? deliveries : []
  const safeShippers = Array.isArray(shippers) ? shippers : []
  const safeVehicles = Array.isArray(vehicles) ? vehicles : []
  const safeStatusOptions = Array.isArray(statusOptions) ? statusOptions : []

  const filtered = useMemo(() => safeDeliveries.filter((delivery) => {
    if (!delivery) return false
    const normalizedQuery = query.trim().toLowerCase()
    const shipper = safeShippers.find((item) => item?._id === delivery.shipperId)
    const vehicle = safeVehicles.find((item) => item?._id === delivery.vehicleId)
    const searchable = [
      delivery._id,
      delivery.pickupAddress,
      delivery.deliveryAddress,
      delivery.status,
      delivery.description,
      shipper?.name,
      vehicle?.plateNumber,
    ].filter(Boolean).join(' ').toLowerCase()
    const statusMatches = status === 'all'
      || (status === 'active' && !['completed', 'cancelled'].includes(delivery.status))
      || delivery.status === status
    return statusMatches && searchable.includes(normalizedQuery) && matchesDate(delivery.createdAt, startDate, endDate)
  }).sort((left, right) => {
    const leftTime = new Date(left?.createdAt || left?.updatedAt || 0).getTime()
    const rightTime = new Date(right?.createdAt || right?.updatedAt || 0).getTime()
    return sort === 'oldest' ? leftTime - rightTime : rightTime - leftTime
  }), [safeDeliveries, endDate, query, safeShippers, sort, startDate, status, safeVehicles])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visiblePage = Math.min(page, pageCount)
  const visible = filtered.slice((visiblePage - 1) * pageSize, visiblePage * pageSize)
  const routePrefix = role === 'shipper' ? '/shipper/deliveries' : '/owner/deliveries'

  return (
    <div className="space-y-4">
      <section className="ui-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1.5fr)_minmax(10rem,0.8fr)_repeat(3,minmax(9rem,0.7fr))]">
          <label className="relative block min-w-0">
            <span className="sr-only">Tìm đơn giao hàng</span>
            <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input aria-label="Tìm đơn giao hàng" className="ui-control block w-full pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã đơn, lộ trình hoặc mô tả" type="search" value={query} />
          </label>
          <label className="block text-xs font-medium text-slate-300">
            Trạng thái
            <select aria-label="Lọc theo trạng thái" className="ui-control mt-1 block w-full py-2" onChange={(event) => setStatus(event.target.value)} value={status}>
              {safeStatusOptions.map((item) => <option key={item} value={item}>{deliveryStatusLabels[item] || 'Không xác định'}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-300">
            Từ ngày
            <input aria-label="Từ ngày" className="ui-control mt-1 block w-full py-2" onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
          </label>
          <label className="block text-xs font-medium text-slate-300">
            Đến ngày
            <input aria-label="Đến ngày" className="ui-control mt-1 block w-full py-2" onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
          </label>
          <label className="block text-xs font-medium text-slate-300">
            Sắp xếp
            <select aria-label="Sắp xếp đơn giao hàng" className="ui-control mt-1 block w-full py-2" onChange={(event) => setSort(event.target.value)} value={sort}>
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((item) => <div className="ui-card space-y-3 p-5" key={item}><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="ui-card">
          <EmptyState title={safeDeliveries.length ? 'Không tìm thấy đơn giao hàng phù hợp' : 'Chưa có đơn giao hàng'} description={safeDeliveries.length ? 'Hãy điều chỉnh từ khóa, khoảng ngày hoặc bộ lọc trạng thái.' : 'Đơn giao hàng mới sẽ xuất hiện tại đây sau khi được tạo.'} />
        </div>
      ) : (
        <section className="ui-card overflow-hidden" aria-label="Danh sách đơn giao hàng">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
            <p className="text-sm font-semibold text-white">Danh sách đơn giao hàng</p>
            <p className="text-xs text-slate-400 font-mono">Tổng cộng {filtered.length} đơn</p>
          </div>
          <div className="hidden md:block">
            <Table className="min-w-[68rem]">
              <thead className="bg-white/[0.03] text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-white/10">
                <tr><th className="px-5 py-3.5">Đơn giao hàng</th><th className="px-5 py-3.5">Nhân viên giao hàng</th><th className="px-5 py-3.5">Phương tiện</th><th className="px-5 py-3.5">Điểm lấy hàng</th><th className="px-5 py-3.5">Điểm đến</th><th className="px-5 py-3.5">Trạng thái</th><th className="px-5 py-3.5">Cập nhật lần cuối</th><th className="px-5 py-3.5"><span className="sr-only">Thao tác</span></th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visible.map((delivery) => {
                  const shipper = safeShippers.find((item) => item?._id === delivery.shipperId)
                  const vehicle = safeVehicles.find((item) => item?._id === delivery.vehicleId)
                  return <tr className="transition hover:bg-white/[0.04]" key={delivery._id}>
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]">{delivery._id ? delivery._id.slice(-8).toUpperCase() : '—'}</td>
                    <td className="px-5 py-4 text-slate-200">{shipper?.name || (delivery.shipperId ? `#${delivery.shipperId.slice(-6)}` : 'Chưa phân công')}</td>
                    <td className="px-5 py-4 text-slate-300">{vehicle?.plateNumber || (delivery.vehicleId ? `#${delivery.vehicleId.slice(-6)}` : '—')}</td>
                    <td className="max-w-48 truncate px-5 py-4 text-slate-300">{delivery.pickupAddress}</td>
                    <td className="max-w-48 truncate px-5 py-4 text-slate-300">{delivery.deliveryAddress}</td>
                    <td className="px-5 py-4"><DeliveryStatus value={delivery.status} /></td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-400">{delivery.updatedAt ? new Date(delivery.updatedAt).toLocaleString() : '—'}</td>
                    <td className="px-5 py-4 text-right"><Link className="text-xs font-semibold text-cyan-400 no-underline hover:text-cyan-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" to={`${routePrefix}/${delivery._id}`}>Xem →</Link></td>
                  </tr>
                })}
              </tbody>
            </Table>
          </div>
          <div className="grid gap-3 p-3 md:hidden">
            {visible.map((delivery) => <DeliveryCard
              delivery={delivery}
              key={delivery._id}
              shipper={safeShippers.find((item) => item?._id === delivery.shipperId)?.name || (delivery.shipperId ? `Nhân viên giao hàng #${delivery.shipperId.slice(-6)}` : '')}
              to={`${routePrefix}/${delivery._id}`}
              vehicle={safeVehicles.find((item) => item?._id === delivery.vehicleId)?.plateNumber || (delivery.vehicleId ? `Phương tiện #${delivery.vehicleId.slice(-6)}` : '')}
            />)}
          </div>
          <Pagination onChange={setPage} page={visiblePage} pageCount={pageCount} total={filtered.length} />
        </section>
      )}
    </div>
  )
}
