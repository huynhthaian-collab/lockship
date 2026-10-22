import {
  Activity,
  Bell,
  CarFront,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Package,
  QrCode,
  Radio,
  Settings,
  Star,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import Brand from '../components/Brand.jsx'

const navigation = {
  owner: [
    { to: '/owner/dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard, end: true },
    { to: '/owner/deliveries', label: 'Đơn giao hàng', icon: Package },
    { to: '/owner/vehicles', label: 'Phương tiện', icon: CarFront },
    { to: '/owner/shippers', label: 'Nhân viên giao hàng', icon: Users },
    { to: '/owner/locks', label: 'Khóa thông minh', icon: LockKeyhole },
    { to: '/owner/qr-tester', label: 'Tạo mã QR Test', icon: QrCode },
    { to: '/owner/notifications', label: 'Thông báo', icon: Bell },
    { to: '/owner/profile', label: 'Hồ sơ', icon: Settings },
  ],
  shipper: [
    { to: '/shipper/dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard, end: true },
    { to: '/shipper/deliveries', label: 'Đơn giao hàng', icon: Package },
    { to: '/shipper/history', label: 'Lịch sử', icon: Activity },
    { to: '/shipper/reports', label: 'Báo cáo', icon: ClipboardList },
    { to: '/shipper/profile', label: 'Hồ sơ', icon: Settings },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard, end: true },
    { to: '/admin/deliveries', label: 'Đơn giao hàng', icon: Package },
    { to: '/admin/vehicles', label: 'Phương tiện', icon: CarFront },
    { to: '/admin/users', label: 'Người dùng', icon: Users },
    { to: '/admin/iot', label: 'Khóa thông minh', icon: LockKeyhole },
    { to: '/admin/qr-tester', label: 'Tạo mã QR Test', icon: QrCode },
    { to: '/admin/feedbacks', label: 'Quản lý Đánh giá', icon: Star },
    { to: '/admin/reports', label: 'Báo cáo', icon: ClipboardList },
    { to: '/admin/logs', label: 'Nhật ký hoạt động', icon: Activity },
  ],
}

export default function Sidebar({ role, collapsed, onToggle, mobileOpen, onClose, onLogout }) {
  const items = navigation[role] || []
  const asideClasses = `fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-[#080c16]/85 backdrop-blur-2xl text-white shadow-[12px_0_40px_rgba(0,0,0,.65)] transition-all duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 ${
    collapsed ? 'w-64 md:w-[4.85rem]' : 'w-64 md:w-64'
  } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Đóng điều hướng"
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md transition-opacity md:hidden"
          onClick={onClose}
          type="button"
        />
      )}
      <aside className={asideClasses} aria-label="Điều hướng chính">
        {/* Brand Header */}
        <div
          className={`flex h-16 shrink-0 items-center border-b border-white/[0.08] px-4 ${
            collapsed ? 'justify-between md:justify-center md:px-2' : 'justify-between px-5'
          }`}
        >
          {collapsed ? (
            <Brand to={`/${role}/dashboard`} markClassName="size-8.5" textClassName="hidden" />
          ) : (
            <Brand
              to={`/${role}/dashboard`}
              markClassName="size-8.5"
              textClassName="text-base font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-200 to-blue-300 bg-clip-text text-transparent"
            />
          )}
          <button
            aria-label="Đóng điều hướng"
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white md:hidden"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav
          className="flex-1 space-y-1.5 overflow-y-auto px-3 py-5"
          aria-label="Không gian làm việc"
        >
          <div
            className={`mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 ${
              collapsed ? 'md:px-0 md:text-center' : ''
            }`}
          >
            {collapsed ? <span className="hidden md:inline">•••</span> : 'Không gian làm việc'}
          </div>

          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              aria-label={label}
              end={end}
              key={to}
              onClick={onClose}
              title={collapsed ? label : undefined}
              to={to}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  collapsed ? 'md:justify-center md:px-0' : ''
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-[0_4px_20px_rgba(37,99,235,0.45),inset_0_1px_0_rgba(255,255,255,0.3)] border-t border-white/20'
                    : 'text-slate-300 hover:bg-white/[0.08] hover:text-white hover:translate-x-0.5'
                }`
              }
            >
              <Icon
                aria-hidden="true"
                className="shrink-0 transition-transform duration-200 group-hover:scale-110"
                size={18}
                strokeWidth={2}
              />
              <span className={`truncate ${collapsed ? 'md:hidden' : ''}`}>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* 3D Holographic IoT Gateway Indicator */}
        {!collapsed && (
          <div className="mx-3 mb-3 hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-3.5 backdrop-blur-md shadow-lg md:block">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-80" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                </span>
                <span className="text-xs font-bold text-slate-100">Spatial Gateway</span>
              </div>
              <Zap size={13} className="text-cyan-400" />
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400 font-mono">
              AES-256 GCM • Telemetry 60Hz
            </p>
          </div>
        )}

        {/* Mobile Logout */}
        <div className="border-t border-white/10 p-3 md:hidden">
          <button
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-400 transition hover:bg-red-500/15"
            onClick={onLogout}
            type="button"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>

        {/* Desktop Collapse Toggle */}
        <div className="hidden border-t border-white/10 p-3 md:block">
          <button
            aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-transparent px-3 py-2 text-xs font-semibold text-slate-400 transition hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
            onClick={onToggle}
            type="button"
          >
            {collapsed ? (
              <ChevronRight size={17} />
            ) : (
              <>
                <ChevronLeft size={17} />
                <span>Thu gọn không gian</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
