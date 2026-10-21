import { Activity, KeyRound, LockKeyhole, ShieldCheck, UserRoundCog, Wifi } from 'lucide-react'

const controls = [
  { title: 'Xác thực được mã hóa', description: 'Phiên đăng nhập đã xác thực giúp bảo vệ mọi không gian làm việc.', icon: LockKeyhole },
  { title: 'Phân quyền theo vai trò', description: 'Trải nghiệm dành cho chủ sở hữu, nhân viên giao hàng và quản trị viên luôn được tách biệt.', icon: UserRoundCog },
  { title: 'Mã có thời hạn', description: 'Mã truy cập chỉ có hiệu lực trong khoảng thời gian giao hàng xác định.', icon: KeyRound },
  { title: 'Truy cập một lần', description: 'Mỗi mã chỉ dùng cho một lần bàn giao an toàn.', icon: ShieldCheck },
  { title: 'Nhật ký hoạt động', description: 'Sự kiện giao hàng và thiết bị được ghi lại để phục vụ kiểm tra.', icon: Activity },
  { title: 'Giám sát thiết bị', description: 'Cập nhật kết nối và trạng thái khóa luôn được hiển thị.', icon: Wifi },
]

export default function SecuritySection() {
  return (
    <section className="scroll-mt-20 bg-transparent py-20 sm:py-24" id="security">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="landing-reveal spatial-card relative overflow-hidden rounded-[2rem] p-6 text-white sm:p-10 lg:p-14">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_100%_0%,rgba(37,99,235,.25),transparent_45%),radial-gradient(ellipse_at_0%_100%,rgba(14,165,233,.15),transparent_36%)]" />
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(148,163,184,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.35)_1px,transparent_1px)] [background-size:40px_40px]" />
          <div className="relative grid items-start gap-10 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div>
              <span className="grid size-12 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.25)]"><ShieldCheck size={24} /></span>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Kiến trúc bảo mật lượng tử</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Bảo mật đa tầng trong từng đơn giao</h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300">Bàn giao hàng không chỉ là một lộ trình. LockShip kết nối danh tính, quyền cấp phép của chủ sở hữu và xác nhận từ thiết bị trong một quy trình thống nhất.</p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3.5 py-1.5 text-xs font-medium text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]"><span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />Kiểm soát bảo mật xuyên suốt quá trình bàn giao</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {controls.map(({ title, description, icon: Icon }) => (
                <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition duration-300 hover:border-cyan-400/30 hover:bg-white/[0.06]" key={title}>
                  <span className="grid size-9 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300"><Icon aria-hidden="true" size={17} /></span>
                  <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-slate-400">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

