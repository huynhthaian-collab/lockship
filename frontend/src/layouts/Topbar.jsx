import { Bell, Check, ChevronRight, LogOut, Menu, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { notificationApi } from '../services/ownerApi.js'
import { useSocketEvent } from '../hooks/useSocketEvent.js'

function titleForPath(pathname) {
  const labels = {
    dashboard: 'Bảng điều khiển',
    deliveries: 'Đơn giao hàng',
    vehicles: 'Phương tiện',
    shippers: 'Nhân viên giao hàng',
    locks: 'Khóa thông minh',
    notifications: 'Thông báo',
    profile: 'Hồ sơ',
    history: 'Lịch sử giao hàng',
    reports: 'Báo cáo',
    users: 'Người dùng',
    iot: 'Khóa thông minh',
    logs: 'Nhật ký hoạt động',
    unlock: 'Nhập mã mở khóa',
    arrive: 'Xác nhận đã đến nơi',
    create: 'Tạo đơn giao hàng',
  }
  const parts = pathname.split('/').filter(Boolean)
  if (parts[1] === 'deliveries' && parts.length > 2 && !labels[parts[parts.length - 1]]) return 'Chi tiết đơn giao hàng'
  if (parts[1] === 'locks' && parts.length > 2 && !labels[parts[parts.length - 1]]) return 'Chi tiết khóa'
  if (parts[1] === 'vehicles' && parts.length > 2 && !labels[parts[parts.length - 1]]) return 'Chi tiết phương tiện'
  return labels[parts[parts.length - 1]] || 'Không gian làm việc'
}

function initials(name) {
  return (name || 'Người dùng').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

export default function Topbar({ user, onMenu, mobileOpen, onLogout }) {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationError, setNotificationError] = useState('')
  const unread = notifications.filter((item) => !item.isRead).length

  useEffect(() => {
    if (!open || !['owner', 'shipper'].includes(user?.role)) return
    let active = true
    notificationApi
      .list()
      .then((items) => {
        if (active) {
          setNotifications(Array.isArray(items) ? items : [])
          setNotificationError('')
        }
      })
      .catch((error) => {
        if (active) setNotificationError(error.message || 'Không thể tải thông báo.')
      })
    return () => {
      active = false
    }
  }, [open, user?.role])

  const onNewNotification = useCallback((notification) => {
    if (!notification) return
    const id = notification._id || notification.id
    setNotifications((current) => [
      notification,
      ...current.filter((item) => (item._id || item.id) !== id),
    ])
  }, [])
  useSocketEvent('notification:new', onNewNotification)

  async function markRead(item) {
    const id = item._id || item.id
    try {
      const updated = await notificationApi.markRead(id)
      setNotifications((current) => current.map((entry) => ((entry._id || entry.id) === id ? updated : entry)))
    } catch (error) {
      setNotificationError(error.message || 'Không thể cập nhật thông báo.')
    }
  }

  const roleLabels = {
    owner: 'Chủ sở hữu',
    shipper: 'Nhân viên giao hàng',
    admin: 'Quản trị viên',
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 min-w-0 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#07090e]/75 px-4 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all sm:px-6">
      {/* Left: Mobile hamburger & Spatial breadcrumbs */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label={mobileOpen ? 'Đóng điều hướng' : 'Mở điều hướng'}
          className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 md:hidden"
          onClick={onMenu}
          type="button"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="hidden text-xs font-semibold text-slate-400 sm:inline">
                {roleLabels[user?.role] || 'Hệ thống'}
              </span>
              <ChevronRight className="hidden size-3 text-slate-600 sm:inline" />
              <h1 className="truncate text-sm font-extrabold tracking-tight text-white sm:text-base">
                {titleForPath(location.pathname)}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Notifications, Profile Capsule & Logout */}
      <div className="flex shrink-0 items-center gap-2.5 sm:gap-4">
        {['owner', 'shipper'].includes(user?.role) && (
          <div className="relative">
            <button
              aria-expanded={open}
              aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ''}`}
              className={`relative grid size-10 place-items-center rounded-xl border transition-all duration-200 ${
                open
                  ? 'border-blue-400/50 bg-blue-600/20 text-blue-300 shadow-[0_0_16px_rgba(59,130,246,0.3)]'
                  : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white'
              }`}
              onClick={() => setOpen((value) => !value)}
              type="button"
            >
              <Bell size={18} strokeWidth={2} />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 grid min-w-4.5 h-4.5 place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow-[0_0_10px_#2563eb] ring-2 ring-[#07090e]">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {/* Spatial Floating Notification Window */}
            {open && (
              <div className="animate-page-in absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/20 border-t-white/30 bg-gradient-to-b from-[#141b2e] to-[#0a0f1d] shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(59,130,246,0.15)] backdrop-blur-2xl">
                <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-4.5 py-3">
                  <div>
                    <h2 className="text-sm font-bold text-white">Trung tâm thông báo</h2>
                    <p className="text-[11px] text-slate-400">{unread} cập nhật chưa đọc</p>
                  </div>
                  {user.role === 'owner' && (
                    <Link
                      className="text-xs font-semibold text-blue-400 no-underline transition hover:text-blue-300"
                      onClick={() => setOpen(false)}
                      to="/owner/notifications"
                    >
                      Xem tất cả
                    </Link>
                  )}
                </div>

                {notificationError ? (
                  <p className="px-4 py-6 text-center text-xs text-red-400">{notificationError}</p>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-xs font-medium text-slate-300">Chưa có thông báo nào</p>
                    <p className="mt-1 text-[11px] text-slate-500">Các hoạt động mở khóa và giao hàng sẽ cập nhật tại đây.</p>
                  </div>
                ) : (
                  <ul className="max-h-80 divide-y divide-white/[0.06] overflow-y-auto">
                    {notifications.slice(0, 5).map((item) => {
                      const id = item._id || item.id
                      return (
                        <li
                          className={`p-3.5 transition-colors hover:bg-white/[0.04] ${
                            item.isRead ? '' : 'bg-blue-600/10'
                          }`}
                          key={id}
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white">{item.title}</p>
                              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-300">
                                {item.message}
                              </p>
                            </div>
                            {!item.isRead && (
                              <button
                                aria-label="Đánh dấu đã đọc"
                                className="shrink-0 rounded-lg p-1 text-blue-400 transition hover:bg-blue-500/20"
                                onClick={() => markRead(item)}
                                type="button"
                              >
                                <Check size={14} />
                              </button>
                            )}
                          </div>
                          {item.deliveryId && (
                            <Link
                              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 no-underline hover:text-blue-300"
                              onClick={() => setOpen(false)}
                              to={`/${user.role}/deliveries/${item.deliveryId}`}
                            >
                              Xem đơn giao hàng <ChevronRight size={12} />
                            </Link>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* Spatial User Profile Capsule */}
        <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] p-1 pr-3.5 backdrop-blur-md shadow-md">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 text-xs font-extrabold text-white shadow-[0_0_12px_rgba(59,130,246,0.5)] border border-white/30"
            aria-hidden="true"
          >
            {initials(user?.name)}
          </span>
          <div className="hidden min-w-0 sm:block text-left">
            <p className="max-w-36 truncate text-xs font-bold text-white">
              {user?.name || 'Tài khoản'}
            </p>
            <p className="text-[10px] font-medium text-slate-400">
              {roleLabels[user?.role] || 'Người dùng'}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          className="hidden items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 shadow-sm transition hover:border-red-400/40 hover:bg-red-500/15 hover:text-red-300 sm:inline-flex"
          onClick={onLogout}
          type="button"
        >
          <LogOut size={14} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </header>
  )
}
