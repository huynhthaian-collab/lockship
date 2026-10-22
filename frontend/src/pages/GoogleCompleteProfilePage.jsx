import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, ArrowRight, MapPin, UserCheck, Truck } from 'lucide-react'
import Brand from '../components/Brand.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Input from '../components/ui/Input.jsx'
import Card from '../components/ui/Card.jsx'
import { useAuth } from '../context/useAuth.js'

export default function GoogleCompleteProfilePage() {
  const { completeGoogleProfile } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState('owner')
  const [address, setAddress] = useState('')
  const [vehicleType, setVehicleType] = useState('Xe máy')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const normalizedAddress = address.trim()
    if (normalizedAddress.length < 3 || normalizedAddress.length > 500) {
      setError('Địa chỉ phải có từ 3 đến 500 ký tự.')
      return
    }

    if (role === 'shipper') {
      const trimmedPlate = vehiclePlate.trim()
      if (!vehicleType) {
        setError('Vui lòng chọn loại phương tiện giao hàng.')
        return
      }
      if (!trimmedPlate || trimmedPlate.length < 4) {
        setError('Vui lòng nhập biển số xe giao hàng hợp lệ (tối thiểu 4 ký tự, ví dụ: 65B1-123.45).')
        return
      }
    }

    setSubmitting(true)
    try {
      await completeGoogleProfile({
        role,
        address: normalizedAddress,
        vehicleType: role === 'shipper' ? vehicleType : undefined,
        vehiclePlate: role === 'shipper' ? vehiclePlate.trim() : undefined,
      })
      navigate('/', { replace: true })
    } catch (profileError) {
      setError(profileError.message || 'Không thể lưu hồ sơ.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center bg-[#06080d] px-5 py-10 text-white overflow-hidden spatial-grid-bg">
      {/* Ambient orbs */}
      <div className="glow-orb-blue -top-24 -left-24 pointer-events-none" />
      <div className="glow-orb-emerald -bottom-24 -right-24 pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg">
        <Card className="p-8 border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl">
          <Brand className="text-white" markClassName="size-9" textClassName="text-sm font-bold tracking-wide" />
          
          <div className="mt-8 flex items-center gap-2">
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
              Tài khoản Google
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-black text-white">Hoàn tất hồ sơ đăng nhập</h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Vui lòng chọn vai trò hoạt động và địa chỉ để bắt đầu sử dụng các tính năng giao hàng & IoT của Lockship.
          </p>

          <div className="mt-4">
            <ErrorMessage message={error} />
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Vai trò trên hệ thống <span className="text-red-400">*</span>
              </label>
              <select
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                name="role"
                onChange={(event) => setRole(event.target.value)}
                value={role}
              >
                <option value="owner">Chủ sở hữu (Quản lý đội xe & đơn hàng)</option>
                <option value="shipper">Nhân viên giao hàng (Vận chuyển & mở khóa)</option>
              </select>
            </div>

            {role === 'shipper' && (
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-3.5 backdrop-blur-md">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                  <Truck className="h-4 w-4" />
                  Thông tin phương tiện giao hàng (Bắt buộc)
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Loại phương tiện <span className="text-rose-400">*</span>
                    </label>
                    <select
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500/50 focus:outline-none"
                      name="vehicleType"
                      onChange={(e) => setVehicleType(e.target.value)}
                      value={vehicleType}
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
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Biển số xe <span className="text-rose-400">*</span>
                    </label>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-mono uppercase text-white focus:border-cyan-500/50 focus:outline-none"
                      maxLength={30}
                      name="vehiclePlate"
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      placeholder="65B1-123.45"
                      required
                      value={vehiclePlate}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Thông tin phương tiện sẽ hiển thị cho Chủ hàng (Owner) khi bạn nhận đơn giao hàng.
                </p>
              </div>
            )}

            <Input
              autoComplete="street-address"
              label="Địa chỉ hoạt động / Trụ sở"
              maxLength={500}
              minLength={3}
              name="address"
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Nhập địa chỉ của bạn hoặc kho bãi"
              required
              value={address}
            />

            <div className="pt-2">
              <button
                aria-busy={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-950/40 transition active:scale-95 disabled:opacity-60"
                disabled={submitting}
                type="submit"
              >
                {submitting ? 'Đang hoàn tất hồ sơ...' : 'Hoàn tất & Tiếp tục'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            <Link className="font-semibold text-cyan-400 hover:text-cyan-300 transition" to="/login">
              Quay lại màn hình đăng nhập
            </Link>
          </p>
        </Card>
      </div>
    </main>
  )
}
