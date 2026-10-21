import { useAuth } from '../context/useAuth.js'

export default function WorkspacePage({ area }) {
  const { user } = useAuth()

  return (
    <section className="border-b border-white/10 pb-8">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-400">
        {area || 'Không gian làm việc'}
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
        Xin chào, {user?.name || 'người dùng LOCKSHIP'}
      </h1>
      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
        Phiên đăng nhập an toàn của bạn đã sẵn sàng cho các hoạt động vận hành và giám sát.
      </p>
    </section>
  )
}