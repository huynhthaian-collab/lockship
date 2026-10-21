import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, pageCount, onChange, total }) {
  if (pageCount <= 1) return null
  return (
    <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-400 font-medium">{total} kết quả · Trang {page} / {pageCount}</p>
      <div className="flex items-center gap-2">
        <button aria-label="Trang trước" className="ui-button-secondary px-3 py-2" disabled={page <= 1} onClick={() => onChange(page - 1)} type="button"><ChevronLeft size={16} /></button>
        <button aria-label="Trang sau" className="ui-button-secondary px-3 py-2" disabled={page >= pageCount} onClick={() => onChange(page + 1)} type="button"><ChevronRight size={16} /></button>
      </div>
    </div>
  )
}

