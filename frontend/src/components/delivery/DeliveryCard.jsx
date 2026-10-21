import { ArrowRight, MapPin, Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import DeliveryStatus from './DeliveryStatus.jsx'
import SpatialTiltCard from '../spatial/SpatialTiltCard.jsx'

export default function DeliveryCard({ delivery, to, shipper, vehicle }) {
  return (
    <SpatialTiltCard className="rounded-2xl" maxTilt={5}>
      <Link
        className="spatial-card group block p-5 text-inherit no-underline transition-all duration-300"
        to={to}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-blue-400/30 bg-blue-500/15 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.3)] transition-transform duration-300 group-hover:scale-110">
              <Package aria-hidden="true" size={18} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-white tracking-wider">
                  #{delivery._id ? delivery._id.slice(-8).toUpperCase() : '—'}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {delivery.createdAt ? new Date(delivery.createdAt).toLocaleDateString('vi-VN') : '—'}
              </p>
            </div>
          </div>
          <DeliveryStatus value={delivery.status} />
        </div>

        <div className="mt-4 space-y-2.5 border-t border-white/[0.08] pt-3.5 text-xs">
          <div className="flex min-w-0 items-start gap-2 text-slate-400">
            <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-slate-500" />
            <span className="line-clamp-1">{delivery.pickupAddress}</span>
          </div>
          <div className="flex min-w-0 items-start gap-2 font-medium text-slate-200">
            <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-blue-400" />
            <span className="line-clamp-1">{delivery.deliveryAddress}</span>
          </div>
        </div>

        {(shipper || vehicle) && (
          <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-2.5 text-[11px] text-slate-400">
            <span>{[shipper, vehicle].filter(Boolean).join(' • ')}</span>
          </div>
        )}

        <div className="mt-3.5 flex items-center justify-end gap-1 text-xs font-semibold text-blue-400 transition group-hover:text-blue-300">
          <span>Xem chi tiết</span>
          <ArrowRight
            aria-hidden="true"
            size={13}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </div>
      </Link>
    </SpatialTiltCard>
  )
}
