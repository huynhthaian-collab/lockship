import { ArrowRight, BriefcaseBusiness, Shield, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'

const roles = [
  { name: 'Chủ sở hữu', description: 'Quản lý đơn giao hàng, phương tiện, nhân viên giao hàng và quyền truy cập khóa thông minh.', icon: BriefcaseBusiness, label: 'Điều phối vận hành' },
  { name: 'Nhân viên giao hàng', description: 'Thực hiện đơn được phân công, nhận cập nhật và hoàn tất bàn giao an toàn.', icon: Truck, label: 'Thực hiện giao hàng' },
  { name: 'Quản trị viên', description: 'Giám sát người dùng, đơn giao hàng, thiết bị IoT và hoạt động hệ thống.', icon: Shield, label: 'Quản trị nền tảng' },
]

export default function RolesSection() {
  return (
    <section className="scroll-mt-20 bg-transparent py-20 sm:py-24" id="about">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="landing-reveal mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Một hệ sinh thái, phân cấp minh bạch</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Thiết kế cho mọi vai trò vận hành</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">Không gian trải nghiệm chuyên biệt dành cho người điều phối, nhân viên giao hàng và quản trị viên hệ thống.</p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {roles.map(({ name, description, icon: Icon, label }) => (
            <article className="spatial-card landing-reveal flex flex-col p-6 transition duration-300 hover:-translate-y-1.5 hover:border-cyan-400/40 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(34,211,238,0.15)] sm:p-7" key={name}>
              <div className="flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)]"><Icon aria-hidden="true" size={21} /></span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300">{label}</span>
              </div>
              <h3 className="mt-6 text-lg font-semibold text-white">{name}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">{description}</p>
              <Link className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 no-underline transition hover:text-cyan-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" to="/register">Khám phá không gian {name.toLowerCase()} →</Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

