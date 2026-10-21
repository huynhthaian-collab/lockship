import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import ErrorMessage from './ErrorMessage.jsx'
import Loading from './Loading.jsx'

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <Loading label="Đang khôi phục phiên đăng nhập" fullScreen />
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return <ErrorMessage title="Từ chối truy cập" message="Tài khoản của bạn không có quyền truy cập trang này." />
  }

  return children ?? <Outlet />
}