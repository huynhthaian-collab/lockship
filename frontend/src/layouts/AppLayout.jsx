import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      navigate('/login', {
        replace: true,
        state: { logoutError: 'Không thể xác nhận đã kết thúc phiên. Hãy kiểm tra kết nối và thử đăng xuất lại.' },
      })
    }
  }

  return (
    <div className="relative min-h-svh bg-[#06080d] text-slate-100 spatial-grid-bg md:flex selection:bg-blue-600 selection:text-white">
      {/* Ambient 3D Glowing Mesh Orbs */}
      <div className="glow-orb-blue -top-24 -left-24" />
      <div className="glow-orb-emerald top-1/3 -right-24" />
      <div className="glow-orb-purple -bottom-24 left-1/3" />

      {/* Floating Spatial Sidebar */}
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
        onToggle={() => setCollapsed((value) => !value)}
        role={user?.role}
      />

      {/* Main Spatial Stage */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar
          key={location.pathname}
          mobileOpen={mobileOpen}
          onLogout={handleLogout}
          onMenu={() => setMobileOpen((value) => !value)}
          user={user}
        />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
          <div className="animate-page-in min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}