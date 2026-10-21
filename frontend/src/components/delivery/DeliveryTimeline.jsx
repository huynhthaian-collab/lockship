import { Check, Clock, Radio } from 'lucide-react'
import SpatialTiltCard from '../spatial/SpatialTiltCard.jsx'

const stages = [
  { key: 'created', label: 'Đã tạo' },
  { key: 'assigned', label: 'Đã phân công' },
  { key: 'accepted', label: 'Đã tiếp nhận' },
  { key: 'in-progress', label: 'Đang thực hiện' },
  { key: 'arrived', label: 'Đã đến nơi' },
  { key: 'authorized', label: 'Đã cấp quyền' },
  { key: 'unlocked', label: 'Đã mở khóa' },
  { key: 'completed', label: 'Đã hoàn tất' },
]

const stageIndex = {
  pending: 0,
  assigned: 1,
  accepted: 2,
  'in-progress': 3,
  arrived: 4,
  authorized: 5,
  completed: 7,
  cancelled: -1,
}

function timestampFor(stage, delivery) {
  const fields = {
    created: delivery.createdAt,
    assigned: delivery.assignedAt,
    accepted: delivery.acceptedAt,
    'in-progress': delivery.startedAt,
    arrived: delivery.arrivedAt,
    authorized: delivery.authorizedAt,
    unlocked: delivery.unlockCompletedAt,
    completed: delivery.completedAt,
  }
  const value = fields[stage]
  return value ? new Date(value).toLocaleString('vi-VN') : ''
}

export default function DeliveryTimeline({ delivery }) {
  const activeIndex =
    delivery.unlockStatus === 'succeeded' && delivery.status === 'authorized'
      ? 6
      : stageIndex[delivery.status] ?? 0

  return (
    <SpatialTiltCard className="rounded-2xl" maxTilt={4}>
      <div className="spatial-card p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-blue-400 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Lộ trình Vận chuyển & IoT Unlock Pipeline
            </h3>
          </div>
          <span className="font-mono text-[11px] text-blue-400 font-semibold">
            Stage {activeIndex + 1}/8
          </span>
        </div>

        <ol aria-label="Tiến độ giao hàng" className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage, index) => {
            const complete = index < activeIndex || (delivery.status === 'completed' && index <= activeIndex)
            const current = index === activeIndex
            const time = timestampFor(stage.key, delivery)

            return (
              <li
                className={`relative flex items-start gap-3 rounded-xl p-3.5 transition-all duration-300 ${
                  current
                    ? 'border border-blue-400/40 bg-blue-500/15 shadow-[0_0_20px_rgba(59,130,246,0.25)] translate-y-[-2px]'
                    : complete
                    ? 'border border-emerald-500/25 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                    : 'border border-white/[0.04] bg-white/[0.02] opacity-55'
                }`}
                key={stage.key}
              >
                {/* 3D Orb Node */}
                <span
                  className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-xl text-xs font-bold transition-all duration-300 ${
                    complete
                      ? 'border border-emerald-300/40 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_0_12px_#10b981]'
                      : current
                      ? 'border border-blue-300/60 bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-[0_0_16px_#3b82f6] animate-pulse'
                      : 'border border-white/10 bg-slate-800 text-slate-400'
                  }`}
                >
                  {complete ? (
                    <Check aria-hidden="true" size={15} strokeWidth={2.5} />
                  ) : current ? (
                    <Clock aria-hidden="true" size={14} strokeWidth={2.5} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </span>

                <div className="min-w-0 flex-1 pt-0.5">
                  <p
                    className={`text-xs font-bold tracking-tight ${
                      current
                        ? 'text-blue-300'
                        : complete
                        ? 'text-slate-100'
                        : 'text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400 truncate">
                    {time || (complete ? 'Đã hoàn tất' : current ? 'Đang thực hiện' : 'Đang chờ')}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </SpatialTiltCard>
  )
}
