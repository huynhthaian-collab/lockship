import { Activity, LockKeyhole, Radio, Workflow } from 'lucide-react'

const capabilities = [
  { value: '4 bước', label: 'Kết nối toàn bộ quy trình giao hàng', icon: Workflow },
  { value: '3 vai trò', label: 'Không gian làm việc chuyên biệt', icon: Activity },
  { value: '24 / 7', label: 'Theo dõi trạng thái thiết bị', icon: Radio },
  { value: '1 quy trình', label: 'Kiểm soát truy cập an toàn', icon: LockKeyhole },
]

export default function Stats() {
  return (
    <section aria-label="Năng lực nền tảng" className="border-y border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Hệ sinh thái vận hành phân tán · Bảo mật phần cứng & Viễn thông thời gian thực</p>
        <div className="mt-7 grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-8">
          {capabilities.map(({ value, label, icon: Icon }) => (
            <div className="flex items-center gap-3 sm:justify-center sm:gap-4" key={label}>
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.2)]"><Icon aria-hidden="true" size={20} /></span>
              <div>
                <p className="font-mono text-xl font-extrabold tracking-tight text-white sm:text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.25)]">{value}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-400 sm:text-xs">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

