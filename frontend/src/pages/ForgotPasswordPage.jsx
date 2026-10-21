import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Brand from '../components/Brand.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loading from '../components/Loading.jsx'
import { authApi } from '../services/authApi.js'

export default function ForgotPasswordPage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    async function handleSubmit(event) {
        event.preventDefault()
        setError('')
        const normalizedEmail = email.trim().toLowerCase()
        if (!normalizedEmail || normalizedEmail.length > 254) {
            setError('Nhập email hợp lệ, không dài quá 254 ký tự.')
            return
        }

        setSubmitting(true)
        try {
            const result = await authApi.forgotPassword(normalizedEmail)
            navigate(`/forgot-password/verify?email=${encodeURIComponent(normalizedEmail)}`, { state: { message: result.message } })
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#06080d] px-5 py-10 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
            {/* Ambient Spatial Glowing Mesh Orbs */}
            <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="glow-orb-blue -left-40 top-1/4" />
                <div className="glow-orb-purple -right-40 top-1/2" />
                <div className="spatial-grid-bg absolute inset-0 opacity-25" />
            </div>

            <section className="spatial-card relative z-10 w-full max-w-md p-6 sm:p-9">
                <Brand className="text-white" markClassName="size-9 drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]" textClassName="text-sm font-bold tracking-wide text-white" />
                <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Khôi phục tài khoản</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">Quên mật khẩu</h1>
                <p className="mt-3 text-sm leading-6 text-slate-400">Nhập địa chỉ email liên kết với tài khoản của bạn để nhận mã xác minh OTP bảo mật.</p>
                <div className="mt-6"><ErrorMessage message={error} /></div>
                <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Email tài khoản
                        </label>
                        <input
                            autoComplete="email"
                            className="ui-control mt-2 block w-full"
                            maxLength={254}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="ten@congty.com"
                            required
                            type="email"
                            value={email}
                        />
                    </div>
                    {submitting ? <Loading label="Đang truyền tín hiệu yêu cầu..." /> : (
                        <button className="ui-button-primary min-h-12 w-full text-sm font-semibold" type="submit">
                            Gửi mã xác minh an toàn
                        </button>
                    )}
                </form>
                <div className="mt-8 border-t border-white/10 pt-4 text-center">
                    <Link className="text-xs font-semibold uppercase tracking-wider text-cyan-400 no-underline transition hover:text-cyan-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" to="/login">
                        ← Quay lại đăng nhập
                    </Link>
                </div>
            </section>
        </main>
    )
}