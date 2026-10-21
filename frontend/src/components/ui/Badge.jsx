const tones = {
  blue: {
    bg: 'bg-blue-500/15 text-blue-300 border-blue-400/30 shadow-[0_0_12px_rgba(59,130,246,0.2)]',
    dot: 'bg-blue-400 shadow-[0_0_8px_#60a5fa]',
  },
  green: {
    bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35 shadow-[0_0_14px_rgba(16,185,129,0.25)]',
    dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
    pulse: true,
  },
  amber: {
    bg: 'bg-amber-500/15 text-amber-300 border-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
    dot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
  },
  red: {
    bg: 'bg-red-500/15 text-red-300 border-red-400/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]',
    dot: 'bg-red-400 shadow-[0_0_8px_#f87171]',
  },
  gray: {
    bg: 'bg-slate-800/60 text-slate-300 border-white/10 shadow-[0_0_8px_rgba(0,0,0,0.3)]',
    dot: 'bg-slate-400',
  },
  purple: {
    bg: 'bg-purple-500/15 text-purple-300 border-purple-400/30 shadow-[0_0_12px_rgba(168,85,247,0.2)]',
    dot: 'bg-purple-400 shadow-[0_0_8px_#c084fc]',
  },
}

export default function Badge({ tone = 'gray', children, className = '', showDot = true }) {
  const currentTone = tones[tone] || tones.gray

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight backdrop-blur-md transition-all duration-200 select-none ${currentTone.bg} ${className}`}
    >
      {showDot && (
        <span className="relative flex size-1.5 shrink-0">
          {currentTone.pulse && (
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${currentTone.dot}`}
            />
          )}
          <span className={`relative inline-flex size-1.5 rounded-full ${currentTone.dot}`} />
        </span>
      )}
      {children}
    </span>
  )
}
