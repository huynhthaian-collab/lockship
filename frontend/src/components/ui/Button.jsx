export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}) {
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-5 py-3 text-base rounded-2xl gap-2.5',
  }

  const variantStyles = {
    primary: 'ui-button-primary',
    secondary: 'ui-button-secondary',
    success:
      'relative inline-flex items-center justify-center font-semibold text-white rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 border-t border-white/35 border-b-2 border-emerald-950 shadow-[0_10px_24px_-6px_rgba(16,185,129,0.55),0_3px_0_0_#065f46] hover:from-emerald-400 hover:to-emerald-600 hover:shadow-[0_14px_28px_-6px_rgba(16,185,129,0.7)] active:translate-y-1 active:shadow-[0_4px_12px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150',
    danger:
      'relative inline-flex items-center justify-center font-semibold text-white rounded-xl bg-gradient-to-b from-red-500 to-red-700 border-t border-white/30 border-b-2 border-red-950 shadow-[0_10px_24px_-6px_rgba(239,68,68,0.5),0_3px_0_0_#991b1b] hover:from-red-400 hover:to-red-600 active:translate-y-1 active:shadow-[0_4px_12px_rgba(239,68,68,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150',
    outline:
      'relative inline-flex items-center justify-center font-semibold text-slate-200 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/20 border-t-white/30 shadow-md hover:bg-white/[0.09] hover:border-white/35 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150',
    ghost:
      'inline-flex items-center justify-center font-semibold bg-transparent text-slate-300 hover:bg-white/[0.08] hover:text-white active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150',
  }

  const style = `${variantStyles[variant] || variantStyles.primary} ${sizeStyles[size] || sizeStyles.md}`

  return (
    <button
      className={`transform-gpu select-none ${style} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="size-4 animate-spin text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
