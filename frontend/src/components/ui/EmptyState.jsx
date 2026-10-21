import { Inbox } from 'lucide-react'

export default function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className = '',
}) {
  return (
    <div className={`flex min-h-56 flex-col items-center justify-center px-5 py-10 text-center ${className}`}>
      <div className="relative mb-4 grid size-14 place-items-center rounded-2xl border border-white/15 bg-white/[0.04] text-cyan-400 shadow-[0_0_30px_rgba(59,130,246,0.18)] backdrop-blur-md">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10" />
        <Icon aria-hidden="true" className="relative size-6 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
      </div>
      <h3 className="text-sm font-semibold tracking-tight text-white sm:text-base">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-400 sm:text-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

