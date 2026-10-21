import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { User, ArrowLeft, Save, Trash2, Mail, Phone, Image, CheckCircle2 } from 'lucide-react'
import ErrorMessage from '../../components/ErrorMessage.jsx'
import Loading from '../../components/Loading.jsx'
import OwnerPage from '../../components/OwnerPage.jsx'
import Card from '../../components/ui/Card.jsx'
import { OwnerNotice } from '../../components/OwnerFeedback.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import { shipperApi } from '../../services/ownerApi.js'

export default function OwnerShipperDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [shipper, setShipper] = useState(null)
    const [form, setForm] = useState({ name: '', email: '', phone: '', avatar: '' })
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [saving, setSaving] = useState(false)

    const refresh = useCallback(async () => {
        setError('')
        try {
            const item = await shipperApi.get(id)
            setShipper(item)
            setForm({
                name: item.name || '',
                email: item.email || '',
                phone: item.phone ?? '',
                avatar: item.avatar ?? ''
            })
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải thông tin nhân viên')
        }
    }, [id])

    useEffect(() => {
        let active = true
        async function fetchInitial() {
            try {
                const item = await shipperApi.get(id)
                if (!active) return
                setShipper(item)
                setForm({
                    name: item.name || '',
                    email: item.email || '',
                    phone: item.phone ?? '',
                    avatar: item.avatar ?? ''
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
            const updated = await shipperApi.update(id, {
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                phone: form.phone.trim(),
                avatar: form.avatar.trim() || null
            })
            setShipper(updated)
            setNotice('Đã cập nhật thông tin nhân viên giao hàng thành công.')
        } catch (requestError) {
            setError(requestError.message || 'Không thể cập nhật thông tin.')
        } finally {
            setSaving(false)
        }
    }

    async function remove() {
        if (!window.confirm(`Xóa nhân viên giao hàng "${shipper?.name}" khỏi đội ngũ? Thao tác này không thể hoàn tác.`)) return
        try {
            await shipperApi.remove(id)
            navigate('/owner/shippers', { replace: true })
        } catch (requestError) {
            setError(requestError.message || 'Không thể xóa nhân viên.')
        }
    }

    if (!shipper && !error) return <Loading label="Đang tải thông tin nhân viên giao hàng..." />

    return (
        <OwnerPage
            eyebrow="Quản lý nhân sự"
            title={shipper?.name || 'Nhân viên giao hàng'}
            description="Cập nhật hồ sơ, số điện thoại liên lạc và quyền truy cập của nhân viên."
        >
            <div className="max-w-2xl">
                <Link
                    className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
                    to="/owner/shippers"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Quay lại danh sách nhân viên
                </Link>

                {error && <ErrorMessage message={error} />}
                {notice && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 backdrop-blur-md shadow-lg shadow-emerald-950/20 mb-4" role="status">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        <span>{notice}</span>
                    </div>
                )}

                {shipper && (
                    <Card className="p-6 border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                {shipper.avatar ? (
                                    <img
                                        alt={shipper.name}
                                        className="h-12 w-12 rounded-2xl object-cover border border-cyan-500/30"
                                        src={shipper.avatar}
                                    />
                                ) : (
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold text-lg">
                                        {(shipper.name || 'S').charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-base font-bold text-white">{shipper.name}</h3>
                                    <p className="text-xs text-slate-400">{shipper.email}</p>
                                </div>
                            </div>
                            <StatusPill value={shipper.status} />
                        </div>

                        <form className="mt-6 space-y-4" onSubmit={submit}>
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Họ và tên <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3.5 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                                        maxLength={100}
                                        minLength={2}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                        value={form.name}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Địa chỉ email <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        autoComplete="email"
                                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3.5 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                                        maxLength={254}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        required
                                        type="email"
                                        value={form.email}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Số điện thoại liên hệ
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        autoComplete="tel"
                                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3.5 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                                        maxLength={30}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        value={form.phone}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Đường dẫn ảnh đại diện
                                </label>
                                <div className="relative">
                                    <Image className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                                        maxLength={2048}
                                        onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                                        placeholder="https://..."
                                        type="url"
                                        value={form.avatar}
                                    />
                                </div>
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
                                    Xóa nhân viên
                                </button>
                            </div>
                        </form>
                    </Card>
                )}
            </div>
        </OwnerPage>
    )
}