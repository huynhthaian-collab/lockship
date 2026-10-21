import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import AppLayout from '../layouts/AppLayout.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import RegisterPage from '../pages/RegisterPage.jsx'
import Loading from '../components/Loading.jsx'
import ProtectedRoute from '../components/ProtectedRoute.jsx'
import ForgotPasswordPage from '../pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from '../pages/ResetPasswordPage.jsx'
import GoogleCompleteProfilePage from '../pages/GoogleCompleteProfilePage.jsx'
import VerifyOtpPage from '../pages/VerifyOtpPage.jsx'
import Home from '../pages/Home.jsx'
import OwnerLayout from '../layouts/OwnerLayout.jsx'
import OwnerDashboardPage from '../pages/owner/OwnerDashboardPage.jsx'
import OwnerProfilePage from '../pages/owner/OwnerProfilePage.jsx'
import OwnerVehiclePage from '../pages/owner/OwnerVehiclesPage.jsx'
import OwnerVehicleCreatePage from '../pages/owner/OwnerVehicleCreatePage.jsx'
import OwnerVehicleDetailPage from '../pages/owner/OwnerVehicleDetailPage.jsx'
import OwnerShipperPage from '../pages/owner/OwnerShippersPage.jsx'
import OwnerShipperDetailPage from '../pages/owner/OwnerShipperDetailPage.jsx'
import OwnerDeliveriesPage from '../pages/owner/OwnerDeliveriesPage.jsx'
import OwnerDeliveryCreatePage from '../pages/owner/OwnerDeliveryCreatePage.jsx'
import OwnerDeliveryDetailPage from '../pages/owner/OwnerDeliveryDetailPage.jsx'
import OwnerLocksPage from '../pages/owner/OwnerLocksPage.jsx'
import OwnerLockDetailPage from '../pages/owner/OwnerLockDetailPage.jsx'
import OwnerNotificationsPage from '../pages/owner/OwnerNotificationsPage.jsx'
import ShipperLayout from '../layouts/ShipperLayout.jsx'
import ShipperDashboardPage from '../pages/shipper/ShipperDashboardPage.jsx'
import ShipperProfilePage from '../pages/shipper/ShipperProfilePage.jsx'
import ShipperDeliveriesPage from '../pages/shipper/ShipperDeliveriesPage.jsx'
import ShipperDeliveryDetailPage from '../pages/shipper/ShipperDeliveryDetailPage.jsx'
import ShipperArrivePage from '../pages/shipper/ShipperArrivePage.jsx'
import ShipperUnlockPage from '../pages/shipper/ShipperUnlockPage.jsx'
import ShipperHistoryPage from '../pages/shipper/ShipperHistoryPage.jsx'
import ShipperReportsPage from '../pages/shipper/ShipperReportsPage.jsx'
import AdminLayout from '../layouts/AdminLayout.jsx'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx'
import AdminUserPage from '../pages/admin/AdminUsersPage.jsx'
import AdminUserDetailPage from '../pages/admin/AdminUserDetailPage.jsx'
import AdminVehiclePage from '../pages/admin/AdminVehiclesPage.jsx'
import AdminDeliveriesPage from '../pages/admin/AdminDeliveriesPage.jsx'
import AdminIoTPage from '../pages/admin/AdminIoTPage.jsx'
import AdminIoTDetailPage from '../pages/admin/AdminIoTDetailPage.jsx'
import AdminReportsPage from '../pages/admin/AdminReportsPage.jsx'
import AdminLogsPage from '../pages/admin/AdminLogsPage.jsx'

function GuestOnlyRoute({ children }) {
  const { isAuthenticated, status } = useAuth()
  if (status === 'loading') return <Loading fullScreen label="Đang khôi phục phiên đăng nhập" />
  return isAuthenticated ? <Navigate to="/" replace /> : children
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />
      <Route path="/google/complete-profile" element={<GuestOnlyRoute><GoogleCompleteProfilePage /></GuestOnlyRoute>} />
      <Route path="/register" element={<GuestOnlyRoute><RegisterPage /></GuestOnlyRoute>} />
      <Route path="/register/verify" element={<GuestOnlyRoute><VerifyOtpPage purpose="REGISTER" /></GuestOnlyRoute>} />
      <Route path="/forgot-password" element={<GuestOnlyRoute><ForgotPasswordPage /></GuestOnlyRoute>} />
      <Route path="/forgot-password/verify" element={<GuestOnlyRoute><VerifyOtpPage purpose="FORGOT_PASSWORD" /></GuestOnlyRoute>} />
      <Route path="/reset-password" element={<GuestOnlyRoute><ResetPasswordPage /></GuestOnlyRoute>} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="owner" element={<ProtectedRoute allowedRoles={['owner']} />}>
            <Route element={<OwnerLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<OwnerDashboardPage />} />
              <Route path="profile" element={<OwnerProfilePage />} />
              <Route path="vehicles" element={<OwnerVehiclePage />} />
              <Route path="vehicles/create" element={<OwnerVehicleCreatePage />} />
              <Route path="vehicles/:id" element={<OwnerVehicleDetailPage />} />
              <Route path="shippers" element={<OwnerShipperPage />} />
              <Route path="shippers/:id" element={<OwnerShipperDetailPage />} />
              <Route path="deliveries" element={<OwnerDeliveriesPage />} />
              <Route path="deliveries/create" element={<OwnerDeliveryCreatePage />} />
              <Route path="deliveries/:id" element={<OwnerDeliveryDetailPage />} />
              <Route path="locks" element={<OwnerLocksPage />} />
              <Route path="locks/:id" element={<OwnerLockDetailPage />} />
              <Route path="notifications" element={<OwnerNotificationsPage />} />
            </Route>
          </Route>
          <Route path="shipper" element={<ProtectedRoute allowedRoles={['shipper']} />}>
            <Route element={<ShipperLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<ShipperDashboardPage />} />
              <Route path="profile" element={<ShipperProfilePage />} />
              <Route path="deliveries" element={<ShipperDeliveriesPage />} />
              <Route path="deliveries/:id" element={<ShipperDeliveryDetailPage />} />
              <Route path="deliveries/:id/arrive" element={<ShipperArrivePage />} />
              <Route path="deliveries/:id/unlock" element={<ShipperUnlockPage />} />
              <Route path="history" element={<ShipperHistoryPage />} />
              <Route path="reports" element={<ShipperReportsPage />} />
            </Route>
          </Route>
          <Route path="admin" element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUserPage />} />
              <Route path="users/:id" element={<AdminUserDetailPage />} />
              <Route path="vehicles" element={<AdminVehiclePage />} />
              <Route path="deliveries" element={<AdminDeliveriesPage />} />
              <Route path="iot" element={<AdminIoTPage />} />
              <Route path="iot/:id" element={<AdminIoTDetailPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="logs" element={<AdminLogsPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}