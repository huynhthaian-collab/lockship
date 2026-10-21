import { AlertCircle, RefreshCw } from 'lucide-react'
import ErrorMessage from './ErrorMessage.jsx'
import Skeleton from './ui/Skeleton.jsx'

export function OwnerLoading({ label = 'Đang tải dữ liệu' }) {
  return (
    <section aria-label={label} aria-live="polite" className="space-y-6" role="status">
      <span className="sr-only">{label}</span>
      <div className="space-y-2.5">
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-9 w-64 max-w-full rounded-xl" />
        <Skeleton className="h-4 w-96 max-w-full rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div className="ui-card space-y-3.5 p-5.5" key={item}>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="size-10 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-3.5 w-44 rounded-md" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="ui-card space-y-4 p-6">
          <Skeleton className="h-5 w-48 rounded-lg" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <div className="ui-card space-y-4 p-6">
          <Skeleton className="h-5 w-48 rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </div>
      </div>
    </section>
  )
}

export function OwnerError({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="my-4 flex items-start justify-between gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 backdrop-blur-md shadow-[0_0_20px_rgba(239,68,68,0.2)]">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-400" />
        <div>
          <p className="font-semibold text-red-300">Không thể tải dữ liệu</p>
          <p className="mt-0.5 text-xs text-red-200/90 leading-relaxed">{error}</p>
        </div>
      </div>
      {onRetry && (
        <button
          className="ui-button-secondary inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
          onClick={onRetry}
          type="button"
        >
          <RefreshCw size={13} />
          Thử lại
        </button>
      )}
    </div>
  )
}

export function OwnerNotice({ children, tone = 'success' }) {
  const styles =
    tone === 'error'
      ? 'border-red-500/30 bg-red-500/10 text-red-200 shadow-[0_0_16px_rgba(239,68,68,0.2)]'
      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.2)]'
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm backdrop-blur-md ${styles}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}