import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, pageCount, onChange, total, className = '' }) {
  if (!pageCount || pageCount <= 1) return null

  return (
    <div className={`flex flex-col gap-3 border-t border-white/10 px-4 py-3.5 text-sm sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <p className="text-xs text-slate-400 font-medium">
        {total !== undefined && <span><strong className="text-white font-bold">{total}</strong> kết quả · </span>}
        Trang <strong className="text-cyan-300 font-bold">{page}</strong> / {pageCount}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          aria-label="Trang trước"
          className="ui-button-secondary px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed transition"
          disabled={page <= 1}
          onClick={() => onChange(Math.max(1, page - 1))}
          type="button"
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Trước</span>
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: pageCount }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1)
            .map((p, idx, arr) => {
              const prev = arr[idx - 1]
              return (
                <span key={p} className="flex items-center">
                  {prev && p - prev > 1 && (
                    <span className="px-1 text-slate-500 text-xs select-none">…</span>
                  )}
                  <button
                    type="button"
                    onClick={() => onChange(p)}
                    className={`size-7 sm:size-8 rounded-xl text-xs font-bold transition-all ${
                      p === page
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.45)]'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {p}
                  </button>
                </span>
              )
            })}
        </div>

        <button
          aria-label="Trang sau"
          className="ui-button-secondary px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed transition"
          disabled={page >= pageCount}
          onClick={() => onChange(Math.min(pageCount, page + 1))}
          type="button"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
