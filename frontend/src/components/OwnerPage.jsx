import { Link } from 'react-router-dom'
import { ArrowRight, Plus } from 'lucide-react'

export default function OwnerPage({ eyebrow, title, description, action, children }) {
  return (
    <div className="min-w-0 space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-end">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.2)]">
                <span className="size-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa]" />
                {eyebrow}
              </span>
            </div>
          )}
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-400">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="shrink-0">
            {typeof action === 'string' ? (
              <Link className="ui-button-primary shrink-0 gap-2" to={action}>
                <Plus aria-hidden="true" size={16} />
                <span>Tạo đơn giao hàng</span>
                <ArrowRight aria-hidden="true" size={14} />
              </Link>
            ) : (
              action
            )}
          </div>
        )}
      </header>
      {children}
    </div>
  )
}