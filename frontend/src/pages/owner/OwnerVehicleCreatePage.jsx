import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Car, ArrowLeft, Plus, Cpu, Hash } from 'lucide-react'
import ErrorMessage from '../../components/ErrorMessage.jsx'
import Loading from '../../components/Loading.jsx'
import OwnerPage from '../../components/OwnerPage.jsx'
import Card from '../../components/ui/Card.jsx'
import { vehicleApi } from '../../services/ownerApi.js'

export default function OwnerVehicleCreatePage() {
    const navigate = useNavigate()
    const [form, setForm] = useState({ plateNumber: '', type: '', model: '', iotDeviceId: '' })
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const submittingRef = useRef(false)

    function update(event) {
        setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    }

    async function submit(event) {
        event.preventDefault()
        if (submittingRef.current) return

        setError('')
        submittingRef.current = true
        setSaving(true)
        try {
            const vehicle = await vehicleApi.create({
                ...form,
                plateNumber: form.plateNumber.trim().toUpperCase(),
                type: form.type.trim(),
                model: form.model.trim(),
                ...(form.iotDeviceId.trim() ? { iotDeviceId: form.iotDeviceId.trim() } : {}),
            })
            if (vehicle?._id) {
                navigate(`/owner/vehicles/${vehicle._id}`, { replace: true })
            } else {
                navigate('/owner/vehicles', { replace: true })
            }
        } catch (requestError) {
            setError(requestError.message || 'Không thể thêm phương tiện.')
        } finally {
            submittingRef.current = false
            setSaving(false)
        }
    }

    return (
        <OwnerPage
            eyebrow="Đội xe"
            title="Đăng ký phương tiện mới"
            description="Thêm phương tiện mới vào đội ngũ quản lý và gán thiết bị IoT điều khiển chốt khóa."
        >
            <div className="max-w-2xl">
                <Link
                    className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
                    to="/owner/vehicles"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Quay lại danh sách phương tiện
                </Link>

                <ErrorMessage message={error} />

                <Card className="p-6 border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl mt-4">
                    <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <Car className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Thông số phương tiện</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Điền thông tin biển kiểm soát và phần cứng khóa</p>
                        </div>
                    </div>

                    <form className="mt-5 space-y-4" onSubmit={submit}>
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                Biển kiểm soát <span className="text-red-400">*</span>
                            </label>
                            <input
                                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm font-mono font-bold uppercase text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                                maxLength={20}
                                minLength={2}
                                name="plateNumber"
                                onChange={update}
                                pattern="[A-Za-z0-9][A-Za-z0-9 -]*"
                                placeholder="Ví dụ: 29A-123.45 hoặc 51C-888.99"
                                required
                                value={form.plateNumber}
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Loại phương tiện <span className="text-red-400">*</span>
                                </label>
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                                    maxLength={50}
                                    name="type"
                                    onChange={update}
                                    placeholder="Ví dụ: Xe tải van, Xe bán tải"
                                    required
                                    value={form.type}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Model / Nhãn hiệu <span className="text-red-400">*</span>
                                </label>
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                                    maxLength={100}
                                    name="model"
                                    onChange={update}
                                    placeholder="Ví dụ: Ford Transit, Hyundai Porter"
                                    required
                                    value={form.model}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                Mã thiết bị IoT liên kết <span className="text-slate-500 font-normal">(Tùy chọn)</span>
                            </label>
                            <div className="relative">
                                <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                                    maxLength={100}
                                    name="iotDeviceId"
                                    onChange={update}
                                    placeholder="Ví dụ: LOCK-ESP32-01"
                                    value={form.iotDeviceId}
                                />
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500">
                                Có thể gán hoặc thay đổi thiết bị khóa sau trong trang chi tiết phương tiện.
                            </p>
                        </div>

                        <div className="pt-3 border-t border-white/10">
                            {saving ? (
                                <Loading label="Đang đăng ký phương tiện..." />
                            ) : (
                                <button
                                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-950/40 transition disabled:opacity-50"
                                    disabled={saving}
                                    type="submit"
                                >
                                    <Plus className="h-4 w-4" />
                                    Tạo phương tiện
                                </button>
                            )}
                        </div>
                    </form>
                </Card>
            </div>
        </OwnerPage>
    )
}