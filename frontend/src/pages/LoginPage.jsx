import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, Sparkles, Zap, Radio } from 'lucide-react'
import Brand from '../components/Brand.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Input from '../components/ui/Input.jsx'
import SpatialTiltCard from '../components/spatial/SpatialTiltCard.jsx'
import IsometricLocker from '../components/spatial/IsometricLocker.jsx'
import { useAuth } from '../context/useAuth.js'
import { authApi } from '../services/authApi.js'

const googleErrorMessages = {
  google_not_configured: 'Đăng nhập bằng Google chưa được cấu hình.',
  google_invalid_state: 'Không thể xác minh yêu cầu đăng nhập Google. Vui lòng thử lại.',
  google_cancelled: 'Bạn đã hủy đăng nhập bằng Google.',
  google_email_not_verified: 'Tài khoản Google cần có địa chỉ email đã xác minh.',
  google_account_unavailable: 'Tài khoản này hiện không thể đăng nhập.',
  google_account_conflict: 'Email này đã được liên kết với một tài khoản Google khác.',
  google_login_failed: 'Đăng nhập bằng Google thất bại. Vui lòng thử lại.',
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(() => {
    const code = new URLSearchParams(window.location.search).get('googleError')
    return googleErrorMessages[code] || ''
  })
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (submittingRef.current) return
    setError('')
    const normalizedEmail = email.trim().toLowerCase()
    if (normalizedEmail.length > 254 || password.length > 128) {
      setError('Email hoặc mật khẩu vượt quá độ dài cho phép.')
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    try {
      await login({ email: normalizedEmail, password })
      navigate('/', { replace: true })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <main className="relative grid min-h-svh bg-[#06080d] text-white spatial-grid-bg lg:grid-cols-[minmax(0,1.15fr)_minmax(30rem,0.95fr)] overflow-hidden">
      {/* Ambient 3D Glowing Mesh Orbs */}
      <div className="glow-orb-blue -top-20 -left-20" />
      <div className="glow-orb-emerald -bottom-24 -right-24" />
      <div className="glow-orb-purple top-1/2 left-1/4" />

      {/* Left Column: Spatial Glass Login Form */}
      <section className="relative z-10 flex items-center justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-20">
        <SpatialTiltCard className="w-full max-w-md rounded-3xl" maxTilt={5}>
          <div className="spatial-card p-8 sm:p-10">
            <div className="mb-8">
              <Brand className="mb-8" textClassName="text-lg font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-blue-300 bg-clip-text text-transparent" />
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-300 shadow-[0_0_14px_rgba(59,130,246,0.25)]">
                <span className="size-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa]" />
                Cổng bảo mật không gian Lockship
              </div>
              <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Đăng nhập hệ thống
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-slate-400 sm:text-sm">
                Quản lý đội xe, phân quyền nhân viên và giám sát khóa thông minh 3D thời gian thực.
              </p>
            </div>

            {location.state?.message && (
              <div
                className="mb-5 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-300 backdrop-blur-md shadow-[0_0_14px_rgba(16,185,129,0.2)]"
                role="status"
              >
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                <span>{location.state.message}</span>
              </div>
            )}

            {location.state?.logoutError && (
              <p
                className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs font-semibold text-amber-300 backdrop-blur-md"
                role="alert"
              >
                {location.state.logoutError}
              </p>
            )}

            <ErrorMessage message={error} />

            <form className="mt-6 space-y-4.5" onSubmit={handleSubmit}>
              <Input
                autoComplete="email"
                label="Địa chỉ email công việc"
                maxLength={254}
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ten@congty.com"
                required
                type="email"
                value={email}
              />

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Mật khẩu
                  </label>
                  <Link
                    className="text-xs font-semibold text-blue-400 transition hover:text-blue-300 hover:underline"
                    to="/forgot-password"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <input
                  autoComplete="current-password"
                  className="ui-control mt-1.5 block w-full"
                  maxLength={128}
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Nhập mật khẩu an toàn"
                  required
                  type="password"
                  value={password}
                />
              </div>

              <button
                aria-busy={submitting}
                className="ui-button-primary mt-2 w-full py-3.5 text-sm font-bold shadow-[0_10px_25px_-5px_rgba(37,99,235,0.6)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submitting}
                type="submit"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="size-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Đang giải mã xác thực...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Truy cập không gian <ArrowRight size={15} />
                  </span>
                )}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-slate-500">
              <span className="h-px flex-1 bg-white/10" />
              <span className="font-semibold uppercase tracking-wider text-[10px]">Hoặc tiếp tục với</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <button
              className="ui-button-secondary w-full py-3"
              disabled={submitting}
              onClick={() => window.location.assign(authApi.googleLoginUrl())}
              type="button"
            >
              <svg className="size-4.5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              Google Workspace SSO
            </button>

            <p className="mt-8 text-center text-xs text-slate-400">
              Chưa có tài khoản doanh nghiệp?{' '}
              <Link className="font-semibold text-blue-400 transition hover:text-blue-300 hover:underline" to="/register">
                Đăng ký tài khoản Chủ sở hữu
              </Link>
            </p>
          </div>
        </SpatialTiltCard>
      </section>

      {/* Right Column: Spatial 3D Cyber Vault Showcase */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-l border-white/10 p-12 lg:flex xl:p-16">
        {/* Header telemetry */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span className="font-mono text-xs font-bold tracking-widest uppercase text-slate-300">
              LOCKSHIP SPATIAL 3.0
            </span>
          </div>
          <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.2)]">
            Holographic Active
          </span>
        </div>

        {/* 3D Isometric Interactive Vault Container in Center */}
        <div className="relative z-10 my-auto flex flex-col items-center">
          <IsometricLocker
            battery={98}
            deviceId="VAULT-ZERO-01"
            isOnline={true}
            lockStatus="locked"
          />

          <div className="mt-6 text-center max-w-md">
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl text-white">
              Bảo mật 3 chiều. <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                Chính xác từng lượt mở khóa.
              </span>
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Cơ chế Geofence 3D tích hợp khóa cơ điện tử chuẩn mã hóa quân sự AES-256. Mở khóa tức thì khi thiết bị xác thực vị trí đích.
            </p>
          </div>

          {/* 3D Feature Badges */}
          <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-sm">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md shadow-lg">
              <LockKeyhole className="size-5 text-blue-400" />
              <p className="mt-2 text-xs font-bold text-white">Chốt khóa 3D Bolt</p>
              <p className="mt-0.5 text-[10px] text-slate-400">Khóa cơ điện tử tự kích hoạt</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md shadow-lg">
              <Radio className="size-5 text-emerald-400" />
              <p className="mt-2 text-xs font-bold text-white">Hologram Telemetry</p>
              <p className="mt-0.5 text-[10px] text-slate-400">Cập nhật Socket trực tiếp 60fps</p>
            </div>
          </div>
        </div>

        {/* Bottom Status bar */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-slate-400 font-mono">
          <span>SPATIAL PROTOCOL V3</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            99.999% Fault Tolerant
          </span>
        </div>
      </aside>
    </main>
  )
}