import { useState, useRef } from 'react'
import { User, Mail, Phone, MapPin, Image, Save, CheckCircle2 } from 'lucide-react'
import ErrorMessage from '../../components/ErrorMessage.jsx'
import Loading from '../../components/Loading.jsx'
import ShipperPage from '../../components/ShipperPage.jsx'
import Card from '../../components/ui/Card.jsx'
import { OwnerNotice } from '../../components/OwnerFeedback.jsx'
import { useAuth } from '../../context/useAuth.js'

export default function ShipperProfilePage() {
    const { user, updateProfile } = useAuth()
    const [form, setForm] = useState({
        name: user?.name ?? '',
        phone: user?.phone ?? '',
        address: user?.address ?? '',
        avatar: user?.avatar ?? ''
    })
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [saving, setSaving] = useState(false)
    const submittingRef = useRef(false)

    async function submit(event) {
        event.preventDefault()
        if (submittingRef.current) return

        setError('')
        setNotice('')
        if (
            form.name.trim().length < 2 ||
            form.name.trim().length > 100 ||
            form.phone.length > 30 ||
            form.address.trim().length < 3 ||
            form.address.length > 500 ||
            form.avatar.length > 2048
        ) {
            setError('Kiểm tra độ dài họ tên (2-100), số điện thoại, địa chỉ (3-500) và đường dẫn ảnh đại diện.')
            return
        }

        submittingRef.current = true
        setSaving(true)
        try {
            await updateProfile({
                name: form.name.trim(),
                phone: form.phone.trim(),
                address: form.address.trim(),
                avatar: form.avatar.trim()
            })
            setNotice('Đã cập nhật hồ sơ thành công.')
        } catch (requestError) {
            setError(requestError.message || 'Không thể cập nhật hồ sơ.')
        } finally {
            submittingRef.current = false
            setSaving(false)
        }
    }

    return (
        <ShipperPage
            eyebrow="Tài khoản cá nhân"
            title="Hồ sơ tài xế giao hàng"
            description="Cập nhật thông tin liên lạc và hồ sơ nhân viên giao hàng trên hệ thống Lockship."
        >
            {error && <ErrorMessage message={error} />}
            {notice && (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 backdrop-blur-md shadow-lg shadow-emerald-950/20" role="status">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{notice}</span>
                </div>
            )}

            <div className="max-w-2xl">
                <Card className="p-6 border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                    {/* User Header Preview */}
                    <div className="flex items-center gap-4 pb-6 border-b border-white/10">
                        {form.avatar ? (
                            <img
                                alt={form.name || 'Avatar'}
                                className="h-16 w-16 rounded-2xl object-cover border border-cyan-500/30 shadow-lg"
                                src={form.avatar}
                            />
                        ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-xl">
                                {(form.name || 'U').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h3 className="text-lg font-bold text-white">{form.name || 'Tài xế'}</h3>
                            <p className="text-xs text-slate-400">{user?.email}</p>
                            <span className="mt-1.5 inline-block rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-bold uppercase text-cyan-300">
                                Nhân viên giao hàng (Shipper)
                            </span>
                        </div>
                    </div>

                    <form className="mt-6 space-y-4" onSubmit={submit}>
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                Họ và tên <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                                    maxLength={100}
                                    minLength={2}
                                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                                    required
                                    value={form.name}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                Địa chỉ email (Định danh đăng nhập)
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/30 pl-9 pr-3 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                                    disabled
                                    value={user?.email || ''}
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
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                                    maxLength={30}
                                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                                    value={form.phone}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                Địa chỉ cư trú / Khu vực hoạt động <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input
                                    autoComplete="street-address"
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                                    maxLength={500}
                                    minLength={3}
                                    onChange={(event) => setForm({ ...form, address: event.target.value })}
                                    required
                                    value={form.address}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                Đường dẫn ảnh đại diện (URL)
                            </label>
                            <div className="relative">
                                <Image className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                                    maxLength={2048}
                                    onChange={(event) => setForm({ ...form, avatar: event.target.value })}
                                    placeholder="https://..."
                                    type="url"
                                    value={form.avatar}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            {saving ? (
                                <Loading label="Đang lưu thông tin..." />
                            ) : (
                                <button
                                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-950/40 transition disabled:opacity-50"
                                    disabled={saving}
                                    type="submit"
                                >
                                    <Save className="h-4 w-4" />
                                    Lưu hồ sơ
                                </button>
                            )}
                        </div>
                    </form>
                </Card>
            </div>
        </ShipperPage>
    )
}