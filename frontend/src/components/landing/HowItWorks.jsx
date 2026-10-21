import { ArrowRight, Check, KeyRound, MapPinned, PackagePlus, UserRoundCheck } from 'lucide-react'

const steps = [
  { number: '01', title: 'Tạo đơn giao hàng', description: 'Chủ sở hữu tạo đơn giao hàng và nhập thông tin điểm đến.', icon: PackagePlus },
  { number: '02', title: 'Phân công nhân viên giao hàng', description: 'Chủ sở hữu phân công đơn giao hàng cho nhân viên và phương tiện.', icon: UserRoundCheck },
  { number: '03', title: 'Cấp quyền truy cập', description: 'Khi nhân viên giao hàng đến nơi, chủ sở hữu xác minh và cấp quyền truy cập.', icon: MapPinned },
  { number: '04', title: 'Mở khóa an toàn', description: 'Nhân viên giao hàng nhập mã bảo mật và khóa IoT gửi lại kết quả.', icon: KeyRound },
]

export default function HowItWorks() {
  return (
    <section className="scroll-mt-20 bg-slate-950/40 py-20 sm:py-24" id="how-it-works">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="landing-reveal flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Từ phân công đến bàn giao</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">LockShip hoạt động như thế nào</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-300">Quy trình bàn giao kết nối chủ sở hữu, nhân viên giao hàng và khóa thông minh trong một luồng có thể truy vết.</p>
        </div>
        <ol className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {steps.map(({ number, title, description, icon: Icon }, index) => (
            <li className="spatial-card landing-reveal relative p-6 transition duration-300 hover:-translate-y-1.5 hover:border-cyan-400/40 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(34,211,238,0.15)]" key={number} style={{ transitionDelay: `${index * 45}ms` }}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold tracking-widest text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">{number}</span>
                <span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-300"><Icon aria-hidden="true" size={19} /></span>
              </div>
              <h3 className="mt-6 text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">{description}</p>
              {index < steps.length - 1 && <span aria-hidden="true" className="absolute -right-3.5 top-1/2 z-10 hidden size-7 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-slate-900 text-cyan-400 shadow-lg xl:grid"><ArrowRight size={14} /></span>}
            </li>
          ))}
        </ol>
        <div className="landing-reveal mt-10 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-400">
          <span className="flex items-center gap-1.5"><Check className="text-emerald-400" size={14} />Chủ sở hữu cấp quyền</span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1.5"><Check className="text-emerald-400" size={14} />Truy cập được máy chủ xác minh</span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1.5"><Check className="text-emerald-400" size={14} />Kết quả được thiết bị xác nhận</span>
        </div>
      </div>
    </section>
  )
}

