import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, UserPlus, Truck } from 'lucide-react'
import Brand from '../components/Brand.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import SpatialTiltCard from '../components/spatial/SpatialTiltCard.jsx'
import { useAuth } from '../context/useAuth.js'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    role: 'owner',
    vehicleType: 'Xe máy',
    vehiclePlate: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const normalizedName = form.name.trim()
    const normalizedEmail = form.email.trim().toLowerCase()
    const trimmedAddress = form.address.trim()
    const normalizedRole = form.role.trim().toLowerCase()

    if (normalizedName.length < 2 || normalizedName.length > 100) {
      setError('Họ tên phải có từ 2 đến 100 ký tự.')
      return
    }
    if (normalizedEmail.length > 254) {
      setError('Email không được dài quá 254 ký tự.')
      return
    }
    if (trimmedAddress.length < 3 || trimmedAddress.length > 500) {
      setError('Địa chỉ phải có từ 3 đến 500 ký tự.')
      return
    }
    if (!['owner', 'shipper'].includes(normalizedRole)) {
      setError('Vai trò không hợp lệ.')
      return
    }

    if (normalizedRole === 'shipper') {
      const trimmedPlate = form.vehiclePlate.trim()
      if (!form.vehicleType) {
        setError('Vui lòng chọn loại phương tiện giao hàng.')
        return
      }
      if (!trimmedPlate || trimmedPlate.length < 4) {
        setError('Vui lòng nhập biển số xe giao hàng hợp lệ (tối thiểu 4 ký tự, ví dụ: 65B1-123.45).')
        return
      }
    }

    if (form.password.length < 8 || form.password.length > 128) {
      setError('Mật khẩu phải có từ 8 đến 128 ký tự.')
      return
    }
    if (form.confirmPassword !== form.password) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }
    if (form.phone.length > 30) {
      setError('Số điện thoại không được dài quá 30 ký tự.')
      return
    }

    setSubmitting(true)
    try {
      await register({
        ...form,
        name: normalizedName,
        email: normalizedEmail,
        address: trimmedAddress,
        role: normalizedRole,
        vehicleType: normalizedRole === 'shipper' ? form.vehicleType : undefined,
        vehiclePlate: normalizedRole === 'shipper' ? form.vehiclePlate.trim() : undefined,
        confirmPassword: form.confirmPassword,
      })
      navigate(`/register/verify?email=${encodeURIComponent(normalizedEmail)}`, { replace: true })
    } catch (registerError) {
      if (registerError.code === 'REGISTRATION_PENDING') {
        navigate(`/register/verify?email=${encodeURIComponent(normalizedEmail)}`, { replace: true })
        return
      }
      setError(registerError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center bg-[#06080d] text-white px-4 py-12 sm:px-6 lg:px-8 spatial-grid-bg overflow-hidden">
      {/* Ambient 3D Glowing Mesh Orbs */}
      <div className="glow-orb-blue top-10 -left-20" />
      <div className="glow-orb-emerald -bottom-20 right-10" />

      <SpatialTiltCard className="relative z-10 w-full max-w-xl rounded-3xl" maxTilt={4}>
        <section className="spatial-card p-7 sm:p-10">
          <div className="mb-6">
            <Brand className="mb-6" textClassName="text-base font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-blue-300 bg-clip-text text-transparent" />
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.25)]">
              <span className="size-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa]" />
              Đăng ký tài khoản không gian
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Tham gia hệ sinh thái Lockship
            </h1>
            <p className="mt-1.5 text-xs text-slate-400 sm:text-sm">
              Trải nghiệm giải pháp khóa vận chuyển thông minh 3D và an toàn thời gian thực.
            </p>
          </div>

          <ErrorMessage message={error} />

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Họ và tên
                </label>
                <input
                  className="ui-control rounded-xl"
                  maxLength={100}
                  minLength={2}
                  name="name"
                  onChange={updateField}
                  placeholder="Nguyễn Văn A"
                  required
                  value={form.name}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Số điện thoại
                </label>
                <input
                  autoComplete="tel"
                  className="ui-control rounded-xl"
                  maxLength={30}
                  name="phone"
                  onChange={updateField}
                  placeholder="0912345678"
                  value={form.phone}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Địa chỉ email công việc
              </label>
              <input
                autoComplete="email"
                className="ui-control rounded-xl"
                maxLength={254}
                name="email"
                onChange={updateField}
                placeholder="ten@congty.com"
                required
                type="email"
                value={form.email}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Địa chỉ trụ sở / hoạt động
              </label>
              <input
                className="ui-control rounded-xl"
                maxLength={500}
                minLength={3}
                name="address"
                onChange={updateField}
                placeholder="Số 123 đường ABC, Quận XYZ, TP. HCM"
                required
                value={form.address}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Vai trò tài khoản
              </label>
              <select
                className="ui-control rounded-xl"
                name="role"
                onChange={updateField}
                value={form.role}
              >
                <option value="owner">Chủ sở hữu hàng hóa / Đội xe (Owner)</option>
                <option value="shipper">Nhân viên giao nhận (Shipper)</option>
              </select>
            </div>

            {form.role === 'shipper' && (
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-3.5 backdrop-blur-md">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                  <Truck className="h-4 w-4" />
                  Thông tin phương tiện giao hàng (Bắt buộc)
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Loại phương tiện <span className="text-rose-400">*</span>
                    </label>
                    <select
                      className="ui-control rounded-xl"
                      name="vehicleType"
                      onChange={updateField}
                      value={form.vehicleType}
                      required
                    >
                      <option value="Xe máy">Xe máy / Hai bánh</option>
                      <option value="Xe tải nhỏ / Van">Xe tải nhỏ / Van</option>
                      <option value="Xe đạp điện">Xe đạp điện</option>
                      <option value="Xe bán tải">Xe bán tải</option>
                      <option value="Xe ô tô con">Xe ô tô con</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Biển số xe <span className="text-rose-400">*</span>
                    </label>
                    <input
                      className="ui-control rounded-xl font-mono uppercase"
                      maxLength={30}
                      name="vehiclePlate"
                      onChange={updateField}
                      placeholder="65B1-123.45"
                      required
                      value={form.vehiclePlate}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Thông tin phương tiện sẽ hiển thị cho Chủ hàng (Owner) khi bạn nhận đơn giao hàng.
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Mật khẩu
                </label>
                <input
                  autoComplete="new-password"
                  className="ui-control rounded-xl"
                  maxLength={128}
                  minLength={8}
                  name="password"
                  onChange={updateField}
                  placeholder="Tối thiểu 8 ký tự"
                  required
                  type="password"
                  value={form.password}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Xác nhận mật khẩu
                </label>
                <input
                  autoComplete="new-password"
                  className="ui-control rounded-xl"
                  maxLength={128}
                  minLength={8}
                  name="confirmPassword"
                  onChange={updateField}
                  placeholder="Nhập lại mật khẩu"
                  required
                  type="password"
                  value={form.confirmPassword}
                />
              </div>
            </div>

            <button
              aria-busy={submitting}
              className="ui-button-primary mt-3 w-full py-3.5 text-sm font-bold shadow-[0_10px_25px_-5px_rgba(37,99,235,0.6)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="size-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Đang khởi tạo không gian...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UserPlus size={16} />
                  Hoàn tất đăng ký <ArrowRight size={15} />
                </span>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Đã có tài khoản?{' '}
            <Link className="font-semibold text-blue-400 transition hover:text-blue-300 hover:underline" to="/login">
              Đăng nhập ngay
            </Link>
          </p>
        </section>
      </SpatialTiltCard>
    </main>
  )
}