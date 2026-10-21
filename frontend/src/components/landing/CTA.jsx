import { ArrowRight, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function CTA() {
  return (
    <section className="bg-transparent px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="landing-reveal relative mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] border border-blue-500/30 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 px-6 py-14 text-center text-white shadow-[0_24px_80px_rgba(30,58,138,0.35)] sm:px-10 sm:py-20">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.25),transparent_40%),radial-gradient(circle_at_80%_100%,rgba(59,130,246,0.3),transparent_45%)]" />
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.4)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="relative mx-auto max-w-2xl">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.35)]"><LockKeyhole aria-hidden="true" size={26} /></span>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">Sẵn sàng trải nghiệm kỷ nguyên Logistics không gian?</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">Quản lý giao hàng, bảo mật truy cập và thiết bị IoT trên cùng một nền tảng trực quan và an toàn tuyệt đối.</p>
          <div className="mt-8 flex justify-center">
            <Link className="ui-button-primary min-h-12 px-7 text-base shadow-[0_0_25px_rgba(37,99,235,0.6)]" to="/register">Bắt đầu ngay hôm nay<ArrowRight aria-hidden="true" size={18} /></Link>
          </div>
        </div>
      </div>
    </section>
  )
}

