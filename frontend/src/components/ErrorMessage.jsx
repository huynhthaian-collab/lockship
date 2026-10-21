import { AlertCircle } from 'lucide-react'

export default function ErrorMessage({ title = 'Đã xảy ra lỗi', message }) {
  if (!message) return null

  return (
    <div className="my-3 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 backdrop-blur-md shadow-[0_0_20px_rgba(239,68,68,0.2)]" role="alert">
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-400" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-red-300">{title}</p>
        <p className="mt-0.5 leading-relaxed text-red-200/90 text-xs sm:text-sm">{message}</p>
      </div>
    </div>
  )
}