import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LockKeyhole,
  Package,
  UnlockKeyhole,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import OwnerPage from '../../components/OwnerPage.jsx'
import { OwnerError, OwnerLoading } from '../../components/OwnerFeedback.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import SpatialTiltCard from '../../components/spatial/SpatialTiltCard.jsx'
import IsometricLocker from '../../components/spatial/IsometricLocker.jsx'
import FloatingFeedbackButton from '../../components/feedback/FloatingFeedbackButton.jsx'
import BoxAccessRequestsSection from '../../components/box/BoxAccessRequestsSection.jsx'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import { deliveryApi, deviceApi, notificationApi, shipperApi, vehicleApi } from '../../services/ownerApi.js'

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—'
}

function MetricCard3D({ label, value, detail, icon: Icon, tone = 'blue' }) {
  const tones = {
    blue: {
      iconBg: 'bg-blue-500/20 text-blue-300 border-blue-400/40 shadow-[0_0_16px_rgba(59,130,246,0.3)]',
      valueColor: 'text-white',
      badge: 'border-blue-400/30 text-blue-300',
    },
    green: {
      iconBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-[0_0_16px_rgba(16,185,129,0.3)]',
      valueColor: 'text-white',
      badge: 'border-emerald-400/30 text-emerald-300',
    },
    amber: {
      iconBg: 'bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-[0_0_16px_rgba(245,158,11,0.3)]',
      valueColor: 'text-white',
      badge: 'border-amber-400/30 text-amber-300',
    },
    slate: {
      iconBg: 'bg-white/10 text-slate-300 border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.1)]',
      valueColor: 'text-slate-200',
      badge: 'border-white/10 text-slate-400',
    },
  }

  const currentTone = tones[tone] || tones.blue

  return (
    <SpatialTiltCard className="rounded-2xl" maxTilt={6}>
      <article className="spatial-card group p-5 transition-all duration-300 sm:p-5.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
            <p className={`mt-2 text-3xl font-extrabold tabular-nums tracking-tight sm:text-3xl ${currentTone.valueColor}`}>
              {value}
            </p>
            <p className="mt-1.5 truncate text-xs text-slate-400">{detail}</p>
          </div>
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-2xl border transition-transform duration-300 group-hover:scale-110 ${currentTone.iconBg}`}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
          </span>
        </div>
      </article>
    </SpatialTiltCard>
  )
}

export default function OwnerDashboardPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setError('')
    try {
      const [vehicles, shippers, deliveries, devices, notifications] = await Promise.all([
        vehicleApi.list(),
        shipperApi.list(),
        deliveryApi.list(),
        deviceApi.list(),
        notificationApi.list(),
      ])
      setData({
        vehicles: Array.isArray(vehicles) ? vehicles : [],
        shippers: Array.isArray(shippers) ? shippers : [],
        deliveries: Array.isArray(deliveries) ? deliveries : [],
        devices: Array.isArray(devices) ? devices : [],
        notifications: Array.isArray(notifications) ? notifications : [],
      })
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải dữ liệu bảng điều khiển.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    async function fetchInitial() {
      try {
        const [vehicles, shippers, deliveries, devices, notifications] = await Promise.all([
          vehicleApi.list(),
          shipperApi.list(),
          deliveryApi.list(),
          deviceApi.list(),
          notificationApi.list(),
        ])
        if (!active) return
        setData({
          vehicles: Array.isArray(vehicles) ? vehicles : [],
          shippers: Array.isArray(shippers) ? shippers : [],
          deliveries: Array.isArray(deliveries) ? deliveries : [],
          devices: Array.isArray(devices) ? devices : [],
          notifications: Array.isArray(notifications) ? notifications : [],
        })
      } catch (requestError) {
        if (active) setError(requestError.message || 'Không thể tải dữ liệu bảng điều khiển.')
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchInitial()
    return () => {
      active = false
    }
  }, [])

  const onArrived = useCallback((event) => {
    setData((current) =>
      current
        ? {
            ...current,
            deliveries: (current.deliveries || []).map((delivery) =>
              delivery._id === event?.deliveryId
                ? { ...delivery, status: 'arrived', arrivedAt: event?.arrivedAt }
                : delivery
            ),
          }
        : current
    )
    notificationApi
      .list()
      .then((notifications) => {
        setData((current) =>
          current ? { ...current, notifications: Array.isArray(notifications) ? notifications : [] } : current
        )
      })
      .catch(() => {})
  }, [])
  useSocketEvent('delivery:arrived', onArrived)

  const deliveries = data?.deliveries ?? []
  const devices = data?.devices ?? []
  const shippers = data?.shippers ?? []
  const vehicles = data?.vehicles ?? []

  const statusCounts = {
    pending: deliveries.filter((item) => ['pending', 'assigned'].includes(item.status)).length,
    progress: deliveries.filter((item) =>
      ['accepted', 'in-progress', 'arrived', 'authorized'].includes(item.status)
    ).length,
    completed: deliveries.filter((item) => item.status === 'completed').length,
    cancelled: deliveries.filter((item) => item.status === 'cancelled').length,
  }
  const online = devices.filter((item) => item.status === 'online').length
  const offline = devices.filter((item) => item.status === 'offline').length
  const locked = devices.filter((item) => item.lockStatus === 'locked').length
  const unlocked = devices.filter((item) => item.lockStatus === 'unlocked').length
  const unread = (data?.notifications ?? []).filter((item) => !item.isRead).length

  // Thiết bị tiêu biểu để trực quan hóa 3D
  const activeDevice = devices[0] || {
    lockStatus: locked > 0 ? 'locked' : unlocked > 0 ? 'unlocked' : 'locked',
    status: online > 0 ? 'online' : 'offline',
    deviceId: 'LOCK-CORE-01',
    battery: 95,
  }

  const overview = [
    { label: 'Đang chờ bàn giao', value: statusCounts.pending, color: 'bg-amber-400', glow: 'shadow-[0_0_12px_#fbbf24]' },
    { label: 'Đang thực hiện', value: statusCounts.progress, color: 'bg-blue-500', glow: 'shadow-[0_0_12px_#3b82f6]' },
    { label: 'Đã hoàn tất an toàn', value: statusCounts.completed, color: 'bg-emerald-400', glow: 'shadow-[0_0_12px_#34d399]' },
    { label: 'Đã hủy', value: statusCounts.cancelled, color: 'bg-red-400', glow: 'shadow-[0_0_12px_#f87171]' },
  ]

  if (loading) return <OwnerLoading label="Đang tải không gian vận hành" />

  return (
    <OwnerPage
      eyebrow="Trung tâm điều hành không gian"
      title="Bảng điều khiển 3D"
      description="Giám sát không gian thời gian thực toàn bộ chuỗi giao nhận, mô phỏng khối khóa IoT và lịch trình đội xe."
      action="/owner/deliveries/create"
    >
      <OwnerError error={error} onRetry={refresh} />

      {/* Bento Row 1: KPI Metrics 3D Grid */}
      <section className="perspective-1000 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Chỉ số hiệu suất">
        <MetricCard3D
          detail="Tổng số đơn trong hệ thống"
          icon={Package}
          label="Tổng số đơn giao"
          tone="blue"
          value={deliveries.length}
        />
        <MetricCard3D
          detail="Đang trên lộ trình vận chuyển"
          icon={Activity}
          label="Đang thực hiện"
          tone="blue"
          value={statusCounts.progress}
        />
        <MetricCard3D
          detail="Đã mở khóa & bàn giao thành công"
          icon={CheckCircle2}
          label="Đã hoàn tất an toàn"
          tone="green"
          value={statusCounts.completed}
        />
        <MetricCard3D
          detail="Chờ phân công hoặc xác nhận"
          icon={Clock3}
          label="Đang chờ xử lý"
          tone="amber"
          value={statusCounts.pending}
        />
        <MetricCard3D
          detail={`${locked} khóa đang ở chế độ bảo vệ`}
          icon={LockKeyhole}
          label="Khóa IoT trực tuyến"
          tone="green"
          value={online}
        />
        <MetricCard3D
          detail="Mất tín hiệu kết nối Gateway"
          icon={UnlockKeyhole}
          label="Khóa IoT ngoại tuyến"
          tone="slate"
          value={offline}
        />
      </section>

      {/* Box Access Requests from Guest Shippers (QR Code Scan) */}
      <BoxAccessRequestsSection className="my-6" />

      {/* Bento Row 2: Deep Analytics & 3D Isometric Locker Showcase */}
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.95fr)]">
        {/* Left: 3D Delivery Pipeline Distribution */}
        <Card
          title="Phân bố tiến độ đơn hàng"
          description="Tỷ lệ phân bổ các đơn giao hàng theo trạng thái vòng đời trong không gian"
          tilt={true}
        >
          {deliveries.length === 0 ? (
            <EmptyState
              title="Chưa có dữ liệu giao hàng"
              description="Khi các đơn giao được tạo, tiến độ và tỷ lệ hoàn thành sẽ hiển thị tại đây."
            />
          ) : (
            <div className="space-y-6">
              {/* 3D Stacked Energy Tube Bar */}
              <div className="relative overflow-hidden rounded-full border border-white/10 bg-slate-900/90 p-1 shadow-inner">
                <div className="flex h-3.5 w-full overflow-hidden rounded-full">
                  {overview.map((item) => {
                    const pct = deliveries.length ? (item.value / deliveries.length) * 100 : 0
                    if (pct === 0) return null
                    return (
                      <div
                        key={item.label}
                        className={`${item.color} ${item.glow} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                        title={`${item.label}: ${item.value}`}
                      />
                    )
                  })}
                </div>
              </div>

              {/* 3D Breakdown Capsules */}
              <div className="grid gap-3 sm:grid-cols-2">
                {overview.map((item) => {
                  const percentage = deliveries.length
                    ? Math.round((item.value / deliveries.length) * 100)
                    : 0
                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`size-3 rounded-full ${item.color} ${item.glow}`} />
                        <span className="text-xs font-semibold text-slate-300">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tabular-nums text-white">
                          {item.value}
                        </span>
                        <span className="text-xs text-slate-400">({percentage}%)</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Right: 3D Isometric Smart Lock Vault */}
        <Card
          title="Mô phỏng Khóa Thông Minh 3D"
          description="Trực quan hóa khối bảo mật IoT Hologram thời gian thực"
          action={
            <Link
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 no-underline transition hover:text-blue-300 hover:underline"
              to="/owner/locks"
            >
              <span>Quản lý khóa</span>
              <ExternalLink size={13} />
            </Link>
          }
        >
          {/* 3D Isometric Locker Canvas */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#111728] to-[#0a0e1a] p-2 shadow-inner">
            <IsometricLocker
              battery={activeDevice.battery ?? 96}
              deviceId={activeDevice.deviceId || 'LOCK-ESP32'}
              isOnline={activeDevice.status === 'online'}
              lockStatus={activeDevice.lockStatus || 'locked'}
            />
          </div>

          {/* Quick Matrix Pills */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-center">
              <span className="text-[11px] font-semibold text-emerald-300">Đang trực tuyến</span>
              <p className="mt-1 text-xl font-extrabold text-emerald-400">{online}</p>
            </div>
            <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-3 text-center">
              <span className="text-[11px] font-semibold text-blue-300">Đã khóa an toàn</span>
              <p className="mt-1 text-xl font-extrabold text-blue-400">{locked}</p>
            </div>
          </div>

          {unread > 0 && (
            <div className="mt-3.5 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
              <Link
                className="flex items-center justify-between text-xs font-semibold text-amber-300 no-underline hover:underline"
                to="/owner/notifications"
              >
                <span>Bạn có {unread} thông báo mới về mở khóa</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Bento Row 3: Translucent Spatial Data Table */}
      <Card
        title="Đơn giao hàng gần đây"
        description="Dữ liệu các đơn vận chuyển mới nhất trong không gian bảo mật"
        action={
          <Link
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 no-underline transition hover:text-blue-300 hover:underline"
            to="/owner/deliveries"
          >
            <span>Xem tất cả</span>
            <ArrowRight size={13} />
          </Link>
        }
        className="overflow-hidden"
      >
        {deliveries.length === 0 ? (
          <EmptyState
            title="Chưa có đơn giao hàng nào"
            description="Bắt đầu tạo đơn mới để theo dõi tiến trình và cấp mã mở khóa thông minh."
            action={
              <Link className="ui-button-primary text-xs" to="/owner/deliveries/create">
                Tạo đơn giao hàng đầu tiên
              </Link>
            }
          />
        ) : (
          <>
            {/* Desktop Translucent Spatial Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="pb-3.5 pl-2">Mã đơn</th>
                    <th className="pb-3.5">Nhân viên giao</th>
                    <th className="pb-3.5">Phương tiện</th>
                    <th className="pb-3.5">Địa chỉ nhận hàng</th>
                    <th className="pb-3.5">Trạng thái</th>
                    <th className="pb-3.5 pr-2">Thời gian tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {deliveries.slice(0, 6).map((delivery) => (
                    <tr
                      className="group transition-colors duration-200 hover:bg-white/[0.04]"
                      key={delivery._id}
                    >
                      <td className="py-3.5 pl-2">
                        <Link
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-400/40 bg-blue-500/15 px-2.5 py-1 font-mono text-xs font-bold text-blue-300 no-underline transition group-hover:border-blue-400 group-hover:bg-blue-500/25 group-hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                          to={`/owner/deliveries/${delivery._id}`}
                        >
                          <span>{delivery._id.slice(-8).toUpperCase()}</span>
                        </Link>
                      </td>
                      <td className="py-3.5 font-medium text-slate-200">
                        {shippers.find((item) => item?._id === delivery.shipperId)?.name || (
                          <span className="text-slate-500 italic">Chưa phân công</span>
                        )}
                      </td>
                      <td className="py-3.5 text-slate-300">
                        {vehicles.find((item) => item?._id === delivery.vehicleId)?.plateNumber || (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="max-w-xs truncate py-3.5 text-slate-300" title={delivery.deliveryAddress}>
                        {delivery.deliveryAddress}
                      </td>
                      <td className="py-3.5">
                        <StatusPill value={delivery.status} />
                      </td>
                      <td className="whitespace-nowrap py-3.5 pr-2 text-xs text-slate-400">
                        {formatDate(delivery.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Spatial Cards */}
            <div className="grid gap-3 md:hidden">
              {deliveries.slice(0, 5).map((delivery) => (
                <Link
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 no-underline backdrop-blur-md shadow-md transition hover:border-white/20 hover:bg-white/[0.06]"
                  key={delivery._id}
                  to={`/owner/deliveries/${delivery._id}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-lg border border-blue-400/40 bg-blue-500/15 px-2 py-0.5 font-mono text-xs font-bold text-blue-300">
                      {delivery._id.slice(-8).toUpperCase()}
                    </span>
                    <StatusPill value={delivery.status} />
                  </div>
                  <p className="mt-2.5 line-clamp-2 text-xs font-medium text-slate-200 leading-relaxed">
                    {delivery.deliveryAddress}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-2 text-[11px] text-slate-400">
                    <span>
                      {shippers.find((item) => item?._id === delivery.shipperId)?.name || 'Chưa gán'}
                    </span>
                    <span>{formatDate(delivery.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Card>
      <FloatingFeedbackButton />
    </OwnerPage>
  )
}
