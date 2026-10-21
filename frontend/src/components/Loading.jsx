export default function Loading({ label = 'Đang tải', fullScreen = false }) {
  return (
    <div
      className={`flex items-center justify-center gap-3 text-sm font-medium text-slate-300 ${fullScreen ? 'min-h-svh' : 'min-h-32'}`}
      role="status"
      aria-live="polite"
    >
      <span className="size-5 animate-spin rounded-full border-2 border-white/20 border-t-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
      <span>{label}</span>
    </div>
  )
}