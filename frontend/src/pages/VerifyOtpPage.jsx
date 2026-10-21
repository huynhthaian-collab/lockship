import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Brand from '../components/Brand.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loading from '../components/Loading.jsx'
import { authApi } from '../services/authApi.js'

const RESEND_COOLDOWN_SECONDS = 60

export default function VerifyOtpPage({ purpose }) {
  const isRegistration = purpose === 'REGISTER'
  const [searchParams] = useSearchParams()
  const email = (searchParams.get('email') || '').trim().toLowerCase()
  const location = useLocation()
  const navigate = useNavigate()
  const [otp, setOtp] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (secondsLeft <= 0) return undefined
    const timer = window.setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [secondsLeft])

  async function handleVerify(event) {
    event.preventDefault()
    setError('')
    if (!email) {
      setError('Thiếu địa chỉ email. Vui lòng quay lại bước trước và thử lại.')
      return
    }
    if (!/^\d{6}$/.test(otp)) {
      setError('Vui lòng nhập mã xác minh gồm 6 chữ số.')
      return
    }

    setSubmitting(true)
    try {
      if (isRegistration) {
        await authApi.verifyRegistration(email, otp)
        navigate('/login', { replace: true, state: { message: 'Email của bạn đã được xác minh. Vui lòng đăng nhập để tiếp tục.' } })
      } else {
        const result = await authApi.verifyForgotPassword(email, otp)
        navigate('/reset-password', { replace: true, state: { resetToken: result.resetToken } })
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setError('')
    setResending(true)
    try {
      if (isRegistration) {
        await authApi.resendRegistrationOtp(email)
      } else {
        await authApi.resendForgotPasswordOtp(email)
      }
      setSecondsLeft(RESEND_COOLDOWN_SECONDS)
      setOtp('')
    } catch (requestError) {
      setError(requestError.message)
      if (requestError.code === 'OTP_RESEND_COOLDOWN') {
        setSecondsLeft(RESEND_COOLDOWN_SECONDS)
      }
    } finally {
      setResending(false)
    }
  }

  const title = isRegistration ? 'Xác minh email' : 'Xác minh danh tính'
  const description = isRegistration
    ? 'Mã xác minh gồm 6 chữ số đã được gửi đến email của bạn.'
    : 'Nếu email của bạn được liên kết với tài khoản, mã xác minh gồm 6 chữ số đã được gửi.'

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#06080d] px-5 py-10 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Ambient Spatial Glowing Mesh Orbs */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="glow-orb-blue -left-40 top-1/4" />
        <div className="glow-orb-emerald -right-40 top-1/2" />
        <div className="spatial-grid-bg absolute inset-0 opacity-25" />
      </div>

      <section className="spatial-card relative z-10 w-full max-w-md p-6 sm:p-9">
        <Brand className="text-white" markClassName="size-9 drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]" textClassName="text-sm font-bold tracking-wide text-white" />
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
          {isRegistration ? 'Xác thực tài khoản' : 'Khôi phục tài khoản'}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
        {email && <p className="mt-2 break-all font-mono text-sm font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">{email}</p>}
        <div className="mt-6"><ErrorMessage message={error} /></div>
        <form className="mt-5 space-y-5" onSubmit={handleVerify}>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="otp">
            Mã OTP 6 chữ số
            <input
              autoComplete="one-time-code"
              className="ui-control mt-2 block w-full text-center font-mono text-3xl font-extrabold tracking-[0.4em] text-cyan-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
              id="otp"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              pattern="\d{6}"
              placeholder="------"
              required
              value={otp}
            />
          </label>
          {submitting ? <Loading label="Đang kiểm tra mã xác thực..." /> : (
            <button className="ui-button-primary min-h-12 w-full text-sm font-semibold" type="submit">Xác thực mã ngay</button>
          )}
        </form>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400">Chưa nhận được mã OTP?</span>
          {secondsLeft > 0 ? (
            <span className="font-mono font-medium text-slate-400">Gửi lại sau {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}</span>
          ) : (
            <button className="font-semibold text-cyan-400 hover:text-cyan-300 disabled:opacity-50" disabled={resending} onClick={handleResend} type="button">
              {resending ? 'Đang gửi…' : 'Gửi lại mã mới'}
            </button>
          )}
        </div>
        <div className="mt-8 border-t border-white/10 pt-4 text-center">
          <Link className="text-xs font-semibold uppercase tracking-wider text-cyan-400 no-underline transition hover:text-cyan-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" state={location.state} to={isRegistration ? '/register' : '/forgot-password'}>
            ← Quay lại bước trước
          </Link>
        </div>
      </section>
    </main>
  )
}

