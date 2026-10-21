import SpatialTiltCard from '../spatial/SpatialTiltCard.jsx'

export default function Card({
  title,
  description,
  action,
  footer,
  className = '',
  bodyClassName = 'p-5 sm:p-6',
  tilt = false,
  children,
}) {
  const content = (
    <section className={`spatial-card min-w-0 overflow-hidden ${className}`}>
      {(title || description || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {title && (
              <h2 className="text-sm font-bold tracking-tight text-slate-100 sm:text-base">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-slate-400">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={`min-w-0 ${bodyClassName}`}>{children}</div>
      {footer && (
        <footer className="border-t border-white/[0.08] bg-black/20 px-5 py-3.5 sm:px-6">
          {footer}
        </footer>
      )}
    </section>
  )

  if (tilt) {
    return <SpatialTiltCard className="rounded-2xl">{content}</SpatialTiltCard>
  }

  return content
}
