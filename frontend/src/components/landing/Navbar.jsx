import { useEffect, useState } from 'react'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import Brand from '../Brand.jsx'
import { useAuth } from '../../context/useAuth.js'
import { getRoleLandingPath } from '../../routes/rolePaths.js'

const links = [
  { label: 'Trang chủ', href: '#home' },
  { label: 'Tính năng', href: '#features' },
  { label: 'Cách hoạt động', href: '#how-it-works' },
  { label: 'Bảo mật', href: '#security' },
  { label: 'Đánh giá', href: '#feedback' },
  { label: 'Giới thiệu', href: '#about' },
]

export default function Navbar() {
  const { user, isAuthenticated, logout, sessionRestoreError } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 12)
    updateScroll()
    window.addEventListener('scroll', updateScroll, { passive: true })
    return () => window.removeEventListener('scroll', updateScroll)
  }, [])

  function closeMenu() {
    setMenuOpen(false)
  }

  const roleLinks = {
    owner: [
      { label: 'Thông báo', href: '/owner/notifications' },
      { label: 'Hồ sơ', href: '/owner/profile' },
    ],
    shipper: [
      { label: 'Đơn giao hàng', href: '/shipper/deliveries' },
      { label: 'Hồ sơ', href: '/shipper/profile' },
    ],
    admin: [
      { label: 'Người dùng', href: '/admin/users' },
    ],
  }
  const authenticatedLinks = [
    { label: 'Bảng điều khiển', href: getRoleLandingPath(user?.role) },
    ...(roleLinks[user?.role] ?? []),
  ]

  async function handleLogout() {
    setLogoutError('')
    closeMenu()
    try {
      await logout()
    } catch {
      setLogoutError('Không thể xác nhận đã kết thúc phiên. Hãy kiểm tra kết nối và thử đăng xuất lại.')
    }
  }

  return (
    <header className={`sticky top-0 z-50 border-b transition duration-200 ${scrolled ? 'border-white/10 bg-[#06080d]/85 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-2xl' : 'border-transparent bg-transparent backdrop-blur-md'}`}>
      <nav aria-label="Điều hướng chính" className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Brand to="/" className="gap-2.5 text-white" markClassName="size-9 drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]" textClassName="text-base font-bold tracking-tight text-white" />

        <div className="hidden items-center gap-7 md:flex">
          {links.map((link) => <a className="text-sm font-medium text-slate-300 no-underline transition hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]" href={link.href} key={link.href}>{link.label}</a>)}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <>
              {authenticatedLinks.map((link) => (
                <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 no-underline transition hover:bg-white/10 hover:text-white" key={link.href} to={link.href}>{link.label}</Link>
              ))}
              <button className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white" onClick={handleLogout} type="button">Đăng xuất</button>
            </>
          ) : (
            <>
              <Link className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-300 no-underline transition hover:bg-white/10 hover:text-white" to="/login">Đăng nhập</Link>
              <Link className="ui-button-primary px-4 py-2.5" to="/register">Bắt đầu<ArrowUpRight aria-hidden="true" size={16} /></Link>
            </>
          )}
        </div>

        <button aria-expanded={menuOpen} aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} className="grid size-10 place-items-center rounded-lg border border-white/15 bg-white/[0.04] text-slate-200 transition hover:bg-white/10 md:hidden" onClick={() => setMenuOpen((open) => !open)} type="button">
          {menuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </nav>

      {menuOpen && (
        <div className="absolute inset-x-0 top-full border-b border-white/10 bg-[#0b0f19]/95 px-4 pb-5 pt-2 shadow-2xl backdrop-blur-2xl md:hidden">
          <nav aria-label="Điều hướng trên thiết bị di động" className="mx-auto grid max-w-7xl gap-1">
            {links.map((link) => <a className="rounded-lg px-3 py-3 text-sm font-medium text-slate-200 no-underline hover:bg-white/10" href={link.href} key={link.href} onClick={closeMenu}>{link.label}</a>)}
            {isAuthenticated ? (
              <div className="mt-2 grid gap-1 border-t border-white/10 pt-3">
                {authenticatedLinks.map((link) => (
                  <Link className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-200 no-underline hover:bg-white/10" key={link.href} onClick={closeMenu} to={link.href}>{link.label}</Link>
                ))}
                <button className="rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/10" onClick={handleLogout} type="button">Đăng xuất</button>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                <Link className="ui-button-secondary" onClick={closeMenu} to="/login">Đăng nhập</Link>
                <Link className="ui-button-primary" onClick={closeMenu} to="/register">Bắt đầu<ArrowUpRight aria-hidden="true" size={16} /></Link>
              </div>
            )}
          </nav>
        </div>
      )}
      {logoutError && <p className="bg-red-500/20 text-red-200 border-b border-red-500/30 px-4 py-2 text-center text-sm" role="alert">{logoutError}</p>}
      {sessionRestoreError && <p className="bg-amber-500/20 text-amber-200 border-b border-amber-500/30 px-4 py-2 text-center text-sm" role="alert">{sessionRestoreError}</p>}
    </header>
  )
}
