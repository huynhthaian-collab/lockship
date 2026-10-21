import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Brand from '../components/Brand.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loading from '../components/Loading.jsx'
import { authApi } from '../services/authApi.js'

export default function ResetPasswordPage() {
    const location = useLocation()
    const navigate = useNavigate()
    const token = location.state?.resetToken || ''
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [error, setError] = useState(token ? '' : 'Không tìm thấy phiên đặt lại mật khẩu. Vui lòng yêu cầu mã xác minh mới.')
    const [submitting, setSubmitting] = useState(false)

    async function handleSubmit(event) {
        event.preventDefault()
        setError('')

        if (!/^[a-f0-9]{64}$/i.test(token)) {
            setError('Phiên đặt lại mật khẩu không tồn tại hoặc không hợp lệ. Hãy yêu cầu mã xác minh mới.')
            return
        }
        if (password.length < 8 || password.length > 128) {
            setError('Mật khẩu phải có từ 8 đến 128 ký tự.')
            return
        }
        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.')
            return
        }

        setSubmitting(true)
        try {
            const result = await authApi.resetPassword(token, password)
            navigate('/login', { replace: true, state: { message: result.message } })
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
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">Đặt lại mật khẩu</h1>
                <div className="mt-6"><ErrorMessage message={error} /></div>
                {!token ? (
                    <div className="mt-6 text-center">
                        <Link className="ui-button-primary min-h-12 w-full text-sm font-semibold" to="/forgot-password">
                            Yêu cầu mã xác minh mới
                        </Link>
                    </div>
                ) : (
                    <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                        <div className="relative">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                                Mật khẩu mới
                            </label>
                            <div className="relative mt-2">
                                <input
                                    autoComplete="new-password"
                                    className="ui-control block w-full pr-11"
                                    maxLength={128}
                                    minLength={8}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="Tối thiểu 8 ký tự"
                                    required
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                />
                                <button aria-label={showPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white" onClick={() => setShowPassword((visible) => !visible)} type="button">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <div className="relative">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                                Xác nhận mật khẩu mới
                            </label>
                            <div className="relative mt-2">
                                <input
                                    autoComplete="new-password"
                                    className="ui-control block w-full pr-11"
                                    maxLength={128}
                                    minLength={8}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    placeholder="Nhập lại mật khẩu mới"
                                    required
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                />
                                <button aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white" onClick={() => setShowConfirmPassword((visible) => !visible)} type="button">
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        {submitting ? <Loading label="Đang cập nhật mật khẩu mã hóa..." /> : (
                            <button className="ui-button-primary min-h-12 w-full text-sm font-semibold" type="submit">
                                Thiết lập mật khẩu mới
                            </button>
                        )}
                    </form>
                )}
                <div className="mt-8 border-t border-white/10 pt-4 text-center">
                    <Link className="text-xs font-semibold uppercase tracking-wider text-cyan-400 no-underline transition hover:text-cyan-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" to="/login">
                        ← Quay lại đăng nhập
                    </Link>
                </div>
            </section>
        </main>
    )
}