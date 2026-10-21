export default function AdminPage({ eyebrow, title, description, action, children }) {
  return (
    <div className="min-w-0 space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-end">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                <span className="size-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
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
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </div>
  )
}