import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Brand from '../Brand.jsx'

const columns = [
  { title: 'Sản phẩm', links: [{ label: 'Tính năng', href: '#features' }, { label: 'Khóa thông minh', href: '#smart-lock' }, { label: 'Theo dõi', href: '#features' }, { label: 'Bảo mật', href: '#security' }] },
  { title: 'Công ty', links: [{ label: 'Về LockShip', href: '#about' }, { label: 'Liên hệ', href: '#about' }] },
  { title: 'Hỗ trợ', links: [{ label: 'Trung tâm trợ giúp', href: '#features' }, { label: 'Tài liệu hướng dẫn', href: '#how-it-works' }] },
]

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#06080d]/90 backdrop-blur-xl" id="footer">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr]">
          <div className="max-w-sm">
            <Brand to="/" className="text-white" markClassName="size-9 drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]" textClassName="text-base font-bold tracking-tight text-white" />
            <p className="mt-3 text-sm leading-6 text-slate-400">Hệ thống quản lý giao hàng & Khóa IoT thông minh</p>
            <p className="mt-4 max-w-xs text-xs leading-5 text-slate-500">Điều phối hoạt động logistics không gian và kiểm soát truy cập bằng quy trình mã hóa lượng tử, an toàn tuyệt đối.</p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((column) => <div key={column.title}><h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">{column.title}</h2><ul className="mt-4 space-y-3">{column.links.map((link) => <li key={link.label}><a className="text-sm text-slate-400 no-underline transition hover:text-cyan-400" href={link.href}>{link.label}</a></li>)}</ul></div>)}
            <div><h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Không gian tài khoản</h2><ul className="mt-4 space-y-3"><li><Link className="text-sm text-slate-400 no-underline transition hover:text-cyan-400" to="/login">Đăng nhập</Link></li><li><Link className="inline-flex items-center gap-1 text-sm text-slate-400 no-underline transition hover:text-cyan-400" to="/register">Đăng ký<ArrowUpRight size={13} /></Link></li></ul></div>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 LockShip. Bản quyền thuộc về Lockship Spatial Network.</p>
          <p>Giao hàng thông minh · Thiết bị kết nối 3D · Truy cập có kiểm soát</p>
        </div>
      </div>
    </footer>
  )
}

