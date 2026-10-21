import { Link } from 'react-router-dom'
import { ArrowLeft, Compass, ShieldAlert } from 'lucide-react'
import Brand from '../components/Brand.jsx'
import { useAuth } from '../context/useAuth.js'

export default function NotFoundPage() {
  const { isAuthenticated } = useAuth()
  const destination = isAuthenticated ? '/' : '/login'

  return (
    <main className="relative grid min-h-svh place-items-center bg-[#06080d] px-5 text-white overflow-hidden spatial-grid-bg">
      <div className="glow-orb-blue -top-24 -left-24 pointer-events-none" />
      <div className="glow-orb-purple -bottom-24 -right-24 pointer-events-none" />

      <div className="relative z-10 max-w-md text-center">
        <Brand className="mx-auto mb-6 text-white" markClassName="size-10" textClassName="text-base font-bold" />

        <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-rose-400">
          <ShieldAlert className="h-3.5 w-3.5" />
          Mã lỗi 404
        </div>

        <h1 className="mt-4 text-3xl font-black text-white">Không tìm thấy trang</h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Đường dẫn bạn yêu cầu không tồn tại hoặc đã được di dời sang vị trí mới trong hệ thống.
        </p>

        <div className="mt-6">
          <Link
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-950/40 transition active:scale-95"
            to={destination}
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại trang chủ LOCKSHIP
          </Link>
        </div>
      </div>
    </main>
  )
}