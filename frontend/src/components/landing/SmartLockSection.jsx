import { Activity, BatteryMedium, Check, Clock3, KeyRound, LockKeyhole, Radio, ShieldCheck, Wifi } from 'lucide-react'
import IsometricLocker from '../spatial/IsometricLocker.jsx'
import SpatialTiltCard from '../spatial/SpatialTiltCard.jsx'

const capabilities = [
  'Mã mở khóa an toàn, có thời hạn',
  'Kết nối IoT và trạng thái thiết bị',
  'Theo dõi pin và nhật ký truy cập',
  'Sự kiện giao hàng và khóa theo thời gian thực',
]

function LockDashboard() {
  return (
    <div className="relative mx-auto max-w-lg">
      <div aria-hidden="true" className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-blue-600/25 via-cyan-500/15 to-emerald-500/15 blur-3xl" />
      <SpatialTiltCard className="p-5 sm:p-6" glareColor="rgba(59, 130, 246, 0.3)">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.25)]"><LockKeyhole size={19} /></span>
            <div><p className="text-sm font-semibold text-white">Khóa thông minh 3D</p><p className="mt-0.5 text-xs text-slate-400">Thiết bị kiểm soát truy cập IoT phương tiện</p></div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300"><span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />Đang trực tuyến</span>
        </div>

        <div className="py-4">
          <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 py-8 text-center">
            <IsometricLocker
              battery={92}
              className="scale-110 sm:scale-125"
              deviceId="LOCK-SECURE-X"
              lockStatus="locked"
              status="online"
            />
            <p className="relative mt-5 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Chốt an toàn vật lý</p>
            <p className="relative mt-1 font-mono text-2xl font-black tracking-[0.16em] text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]">ĐÃ KHÓA AN TOÀN</p>
            <span className="relative mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-medium text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]"><ShieldCheck size={12} />Mã hóa phần cứng AES-256</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-400"><BatteryMedium size={14} className="text-emerald-400" />Năng lượng Pin</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-lg font-bold text-emerald-400">92%</span>
                <span className="h-2 w-14 overflow-hidden rounded-full bg-slate-800 border border-white/10">
                  <span className="block h-full w-[92%] rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" />
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-400"><Activity size={14} className="text-cyan-400" />Tín hiệu viễn thông</p>
              <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-cyan-300"><Wifi size={15} />Mạng LTE-M</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Mã định danh thiết bị</p>
              <p className="mt-0.5 font-mono text-xs font-bold text-cyan-300">LS-LOCK-001</p>
            </div>
            <p className="flex items-center gap-1.5 font-mono text-xs text-slate-400"><Clock3 size={14} />Nhận tin · 12s trước</p>
          </div>

          <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400"><span className="flex items-center gap-1.5"><Radio size={13} className="text-cyan-400" />Spatial Telemetry 3D</span><span className="flex items-center gap-1.5"><KeyRound size={13} className="text-emerald-400" />Chỉ lệnh xác thực cấp quyền</span></div>
        </div>
      </SpatialTiltCard>
    </div>
  )
}


export default function SmartLockSection() {
  return (
    <section className="scroll-mt-20 overflow-hidden bg-slate-950 py-20 text-white sm:py-24" id="smart-lock">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div className="landing-reveal">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">Kiểm soát truy cập kết nối</p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">Truy cập an toàn nhờ IoT</h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">LockShip kết nối quy trình giao hàng với công nghệ khóa thông minh để cung cấp quyền truy cập an toàn, có kiểm soát và có thể truy vết.</p>
          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {capabilities.map((item) => <li className="flex items-start gap-2.5 text-sm text-slate-200" key={item}><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-300"><Check size={12} /></span>{item}</li>)}
          </ul>
          <div className="mt-8 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.045] p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-blue-300/15 bg-blue-400/10 text-blue-200"><ShieldCheck size={18} /></span>
            <p className="text-xs leading-5 text-slate-300">Việc cấp quyền mở khóa luôn nằm trong quy trình giao hàng an toàn. Trình duyệt không bao giờ gửi lệnh trực tiếp đến thiết bị.</p>
          </div>
        </div>
        <div className="landing-reveal"><LockDashboard /></div>
      </div>
    </section>
  )
}
