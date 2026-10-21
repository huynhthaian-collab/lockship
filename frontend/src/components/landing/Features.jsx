import { BellRing, ChartNoAxesCombined, KeyRound, MapPinned, PackageCheck, RadioTower } from 'lucide-react'

const features = [
  { title: 'Quản lý đơn giao hàng thông minh', description: 'Tạo, phân công và theo dõi đơn giao hàng trong một không gian vận hành rõ ràng.', icon: PackageCheck, tone: 'blue' },
  { title: 'Theo dõi thời gian thực', description: 'Cập nhật tiến độ giao hàng và trạng thái đến nơi theo thời gian thực.', icon: MapPinned, tone: 'cyan' },
  { title: 'Tích hợp khóa thông minh', description: 'Kết nối phương tiện với khóa IoT và theo dõi trạng thái trực tiếp.', icon: RadioTower, tone: 'indigo' },
  { title: 'Truy cập an toàn', description: 'Phối hợp xác nhận của chủ sở hữu và mã mở khóa có giới hạn thời gian.', icon: KeyRound, tone: 'emerald' },
  { title: 'Thông báo', description: 'Thông báo đến đúng người về các sự kiện giao hàng quan trọng.', icon: BellRing, tone: 'amber' },
  { title: 'Thống kê và báo cáo', description: 'Theo dõi hiệu quả giao hàng, thiết bị đã kết nối và hoạt động hệ thống.', icon: ChartNoAxesCombined, tone: 'violet' },
]

const tones = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
}

export default function Features() {
  return (
    <section className="scroll-mt-20 bg-transparent py-20 sm:py-24" id="features">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="landing-reveal mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Không gian điều khiển thống nhất</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Mọi công cụ bạn cần cho kỷ nguyên Spatial Logistics</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">Nền tảng toàn diện để quản lý đơn giao hàng, phương tiện, nhân viên giao hàng và khóa thông minh IoT.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ title, description, icon: Icon }, index) => (
            <article className="spatial-card landing-reveal group p-6 transition duration-300 hover:-translate-y-1.5 hover:border-cyan-400/40 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(34,211,238,0.15)]" key={title} style={{ transitionDelay: `${index * 35}ms` }}>
              <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-300 transition duration-300 group-hover:scale-110 group-hover:border-cyan-400/30 group-hover:shadow-[0_0_16px_rgba(34,211,238,0.3)]">
                <Icon aria-hidden="true" size={22} strokeWidth={1.8} />
              </span>
              <h3 className="mt-5 text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

