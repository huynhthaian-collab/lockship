import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
}) {
  useEffect(() => {
    if (!open) return undefined
    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  if (!open) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
  }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-xl transition-all"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        aria-labelledby="dialog-title"
        aria-modal="true"
        className={`animate-page-in preserve-3d w-full ${
          sizeClasses[size] || sizeClasses.md
        } rounded-2xl border border-white/20 border-t-white/30 bg-gradient-to-b from-[#141b2d] to-[#0c111e] shadow-[0_25px_60px_-12px_rgba(0,0,0,0.9),0_0_30px_rgba(59,130,246,0.15)] transition-all`}
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.08] bg-white/[0.02] px-6 py-4.5">
          <div>
            <h2
              className="text-base font-bold tracking-tight text-white"
              id="dialog-title"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            aria-label="Đóng hộp thoại"
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        {children && <div className="p-6 text-slate-200">{children}</div>}

        {footer && (
          <footer className="flex flex-col-reverse justify-end gap-2.5 border-t border-white/[0.08] bg-black/30 px-6 py-4 sm:flex-row">
            {footer}
          </footer>
        )}
      </section>
    </div>
  )
}
