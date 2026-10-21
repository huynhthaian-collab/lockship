import { ArrowDown, ArrowRight, BatteryFull, Check, Clock3, LockKeyhole, MapPin, Radio, ShieldCheck, Truck, Wifi } from 'lucide-react'
import { Link } from 'react-router-dom'
import IsometricLocker from '../spatial/IsometricLocker.jsx'
import SpatialTiltCard from '../spatial/SpatialTiltCard.jsx'

function StatusCard() {
  return (
    <div className="hero-float absolute -bottom-8 -left-5 z-20 w-[min(22rem,calc(100%-1.5rem))] rounded-2xl border border-white/15 bg-slate-900/90 p-4 shadow-[0_24px_64px_-20px_rgba(0,0,0,0.85),0_0_30px_rgba(59,130,246,0.2)] backdrop-blur-2xl sm:-left-12 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.25)]"><Truck aria-hidden="true" size={19} /></span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Giám sát lộ trình không gian</p>
            <p className="mt-0.5 font-mono text-sm font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">LS-1024</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-300">
          <span className="size-1.5 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          Đang vận chuyển
        </span>
      </div>
      <div className="my-3.5 border-t border-white/10" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Nhân viên</p>
          <p className="mt-0.5 font-medium text-white">Nguyễn Văn A</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Điểm đến</p>
          <p className="mt-0.5 font-medium text-white">Cần Thơ, VN</p>
        </div>
      </div>
      <div className="mt-3.5 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="grid size-6 place-items-center rounded-lg border border-emerald-500/20 bg-emerald-500/15 text-emerald-400"><LockKeyhole size={13} /></span>
          <span>
            <span className="block text-[9px] uppercase tracking-wider text-slate-400">Khóa IoT</span>
            <span className="font-semibold text-emerald-300">Đã kích hoạt</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-mono text-[10px] font-semibold text-slate-300"><BatteryFull className="text-emerald-400" size={14} />87%</span>
          <span className="flex items-center gap-1 font-mono text-[10px] font-semibold text-slate-300"><Clock3 className="text-cyan-400" size={13} />12m</span>
        </div>
      </div>
      <p className="mt-2 text-center text-[9px] text-slate-500">Mô phỏng dữ liệu thời gian thực · Hệ sinh thái Lockship 3D</p>
    </div>
  )
}

function LogisticsVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[38rem] pb-8 pl-3 pr-2 pt-2 sm:pb-10 sm:pl-8 sm:pr-5">
      <div aria-hidden="true" className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-blue-600/20 via-cyan-500/10 to-indigo-600/15 blur-3xl" />
      <SpatialTiltCard className="p-4 sm:p-6" glareColor="rgba(59, 130, 246, 0.25)">
        <div className="relative flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)]"><Radio size={17} /></span>
            <div><p className="text-xs font-semibold text-white">Vận hành đội xe 3D</p><p className="mt-0.5 text-[10px] text-slate-400">Không gian quản lý logistics thời gian thực</p></div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]"><span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />Hệ thống trực tuyến</span>
        </div>

        <div className="relative mt-6 flex min-h-[17rem] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 sm:min-h-[20rem]">
          <svg aria-hidden="true" className="absolute inset-0 size-full opacity-60" fill="none" preserveAspectRatio="none" viewBox="0 0 520 300">
            <path d="M74 220C145 220 138 90 233 115c77 20 75 108 145 76 28-13 33-52 71-68" stroke="url(#route-gradient)" strokeDasharray="5 8" strokeLinecap="round" strokeWidth="3" />
            <circle cx="74" cy="220" r="5" fill="#60A5FA" /><circle cx="449" cy="123" r="5" fill="#34D399" />
            <defs><linearGradient id="route-gradient" x1="74" x2="449" y1="220" y2="123" gradientUnits="userSpaceOnUse"><stop stopColor="#60A5FA" /><stop offset="1" stopColor="#34D399" /></linearGradient></defs>
          </svg>
          <div className="absolute left-[6%] top-[14%] rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-blue-500/15 text-blue-300"><Truck size={15} /></span>
              <span><span className="block text-[9px] uppercase tracking-wider text-slate-400">Phương tiện</span><span className="block font-mono text-[10px] font-semibold text-white">LS-04</span></span>
            </div>
          </div>

          {/* 3D Isometric Locker Object in Hero */}
          <div className="relative z-10 flex flex-col items-center py-4">
            <IsometricLocker
              battery={87}
              className="scale-100 sm:scale-110"
              deviceId="LOCK-PRO-01"
              lockStatus="unlocked"
              status="online"
            />
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              Khóa thông minh 3D Spatial
            </p>
          </div>

          <div className="absolute bottom-[10%] right-[6%] rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300"><MapPin size={15} /></span>
              <span><span className="block text-[9px] uppercase tracking-wider text-slate-400">Điểm đích</span><span className="block text-[10px] font-semibold text-white">Cần Thơ</span></span>
            </div>
          </div>
          <span className="absolute bottom-[15%] left-[8%] flex items-center gap-1.5 text-[9px] font-medium text-cyan-200">
            <span className="grid size-4 place-items-center rounded-full bg-cyan-400/20 text-cyan-300"><Check size={10} /></span>
            Lộ trình đã mã hóa bảo vệ
          </span>
        </div>

        <div className="relative mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          {[{ label: 'Thiết bị trực tuyến', value: 'Đã kết nối', icon: Wifi }, { label: 'Kiểm soát truy cập', value: 'Được bảo vệ', icon: ShieldCheck }, { label: 'Theo dõi', value: 'Thời gian thực', icon: Radio }].map(({ label, value, icon: Icon }) => (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-3 sm:px-3.5" key={label}>
              <div className="flex items-center gap-1.5 text-[9px] text-slate-400 sm:text-[10px]"><Icon aria-hidden="true" size={13} className="text-cyan-400" /><span className="truncate">{label}</span></div>
              <p className="mt-1 text-[11px] font-semibold text-white sm:text-xs">{value}</p>
            </div>
          ))}
        </div>
      </SpatialTiltCard>
      <StatusCard />
    </div>
  )
}

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950 to-blue-950 text-white" id="home">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,.18),transparent_35%),radial-gradient(circle_at_20%_80%,rgba(6,182,212,.1),transparent_30%)]" />
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(148,163,184,.4)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.4)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 pt-14 sm:px-6 sm:pb-28 sm:pt-20 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6 lg:px-8 lg:pb-32 lg:pt-24">
        <div className="landing-reveal relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-medium text-blue-200"><span className="size-1.5 rounded-full bg-blue-400" />Hệ thống quản lý giao hàng thông minh</div>
          <h1 className="mt-6 text-[2.65rem] font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl lg:text-[4.4rem]">Giao hàng thông minh.<br /><span className="bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">Truy cập an toàn.</span><br />Đơn giản hóa.</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">LockShip kết nối quản lý giao hàng, theo dõi thời gian thực và công nghệ khóa thông minh trên một nền tảng an toàn.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="ui-button-primary min-h-12 px-5" to="/register">Bắt đầu<ArrowRight aria-hidden="true" size={17} /></Link>
            <a className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white no-underline transition hover:border-white/30 hover:bg-white/10" href="#features">Khám phá tính năng<ArrowDown aria-hidden="true" size={16} /></a>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400"><span className="flex items-center gap-2"><Check className="text-emerald-400" size={15} />Quy trình theo vai trò</span><span className="flex items-center gap-2"><Check className="text-emerald-400" size={15} />Vòng đời truy cập an toàn</span></div>
        </div>
        <div className="landing-reveal relative z-10 lg:pl-4"><LogisticsVisual /></div>
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950 to-transparent" />
    </section>
  )
}
