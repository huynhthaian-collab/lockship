import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Car, ArrowLeft, Save, Trash2, Cpu, CheckCircle2 } from 'lucide-react'
import Loading from '../../components/Loading.jsx'
import OwnerPage from '../../components/OwnerPage.jsx'
import Card from '../../components/ui/Card.jsx'
import { OwnerError, OwnerNotice } from '../../components/OwnerFeedback.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import { vehicleApi } from '../../services/ownerApi.js'

export default function OwnerVehicleDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [vehicle, setVehicle] = useState(null)
    const [form, setForm] = useState(null)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [saving, setSaving] = useState(false)

    const refresh = useCallback(async () => {
        setError('')
        try {
            const current = await vehicleApi.get(id)
            setVehicle(current)
            setForm({
                plateNumber: current.plateNumber || '',
                type: current.type || '',
                model: current.model || '',
                iotDeviceId: current.iotDeviceId ?? '',
                status: current.status || 'active'
            })
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải thông tin phương tiện')
        }
    }, [id])

    useEffect(() => {
        let active = true
        async function fetchInitial() {
            try {
                const current = await vehicleApi.get(id)
                if (!active) return
                setVehicle(current)
                setForm({
                    plateNumber: current.plateNumber || '',
                    type: current.type || '',
                    model: current.model || '',
                    iotDeviceId: current.iotDeviceId ?? '',
                    status: current.status || 'active'
                })
            } catch (err) {
                if (active) setError(err.message || 'Lỗi kết nối máy chủ')
            }
        }
        fetchInitial()
        return () => {
            active = false
        }
    }, [id])

    async function submit(event) {
        event.preventDefault()
        setSaving(true)
        setError('')
        setNotice('')
        try {
            const updated = await vehicleApi.update(id, {
                ...form,
                plateNumber: form.plateNumber.trim().toUpperCase(),
                iotDeviceId: form.iotDeviceId.trim() || null
            })
            setVehicle(updated)
            setNotice('Đã cập nhật phương tiện thành công.')
        } catch (requestError) {
            setError(requestError.message || 'Không thể cập nhật phương tiện.')
        } finally {
            setSaving(false)
        }
    }

    async function remove() {
        if (!window.confirm(`Xóa phương tiện ${vehicle?.plateNumber}? Thao tác này không thể hoàn tác.`)) return
        try {
            await vehicleApi.remove(id)
            navigate('/owner/vehicles', { replace: true })
        } catch (requestError) {
            setError(requestError.message || 'Không thể xóa phương tiện.')
        }
    }

    if (!vehicle && !error) return <Loading label="Đang tải thông tin phương tiện..." />

    return (
        <OwnerPage
            eyebrow="Chi tiết đội xe"
            title={vehicle?.plateNumber || 'Phương tiện'}
            description="Cập nhật cấu hình xe, phân bổ thiết bị phần cứng IoT và kích hoạt trạng thái vận hành."
        >
            <div className="max-w-2xl">
                <Link
                    className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
                    to="/owner/vehicles"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Quay lại danh sách phương tiện
                </Link>

                <OwnerError error={error} onRetry={refresh} />
                {notice && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 backdrop-blur-md shadow-lg shadow-emerald-950/20 mb-4" role="status">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        <span>{notice}</span>
                    </div>
                )}

                {vehicle && form && (
                    <Card className="p-6 border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                    <Car className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white font-mono">{vehicle.plateNumber}</h3>
                                    <p className="text-xs text-slate-400">
                                        Cập nhật: {vehicle.updatedAt ? new Date(vehicle.updatedAt).toLocaleString('vi-VN') : '—'}
                                    </p>
                                </div>
                            </div>
                            <StatusPill value={vehicle.status} />
                        </div>

                        <form className="mt-6 space-y-4" onSubmit={submit}>
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Biển số xe <span className="text-red-400">*</span>
                                </label>
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm font-mono font-bold uppercase text-white focus:border-cyan-500/50 focus:outline-none"
                                    maxLength={20}
                                    minLength={2}
                                    onChange={(event) => setForm({ ...form, plateNumber: event.target.value })}
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
                                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                                        maxLength={50}
                                        onChange={(event) => setForm({ ...form, type: event.target.value })}
                                        required
                                        value={form.type}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                        Mẫu xe <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                                        maxLength={100}
                                        onChange={(event) => setForm({ ...form, model: event.target.value })}
                                        required
                                        value={form.model}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Thiết bị khóa IoT liên kết
                                </label>
                                <div className="relative">
                                    <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                                        maxLength={100}
                                        onChange={(event) => setForm({ ...form, iotDeviceId: event.target.value })}
                                        placeholder="Để trống nếu chưa gắn thiết bị"
                                        value={form.iotDeviceId}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Trạng thái hoạt động
                                </label>
                                <select
                                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                                    onChange={(event) => setForm({ ...form, status: event.target.value })}
                                    value={form.status}
                                >
                                    <option value="active">Đang hoạt động (Sẵn sàng nhận chuyến)</option>
                                    <option value="inactive">Không hoạt động (Bảo trì / Tạm ngưng)</option>
                                </select>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
                                <div className="flex items-center gap-3">
                                    {saving ? (
                                        <Loading label="Đang lưu thay đổi..." />
                                    ) : (
                                        <button
                                            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-950/40 transition disabled:opacity-50"
                                            disabled={saving}
                                            type="submit"
                                        >
                                            <Save className="h-4 w-4" />
                                            Lưu thay đổi
                                        </button>
                                    )}
                                </div>

                                <button
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition"
                                    onClick={remove}
                                    type="button"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Xóa phương tiện
                                </button>
                            </div>
                        </form>
                    </Card>
                )}
            </div>
        </OwnerPage>
    )
}