import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Users,
    UserPlus,
    Mail,
    Lock,
    Phone,
    MapPin,
    ArrowRight,
    Search,
    ShieldCheck,
    X,
    User
} from 'lucide-react'
import OwnerPage from '../../components/OwnerPage.jsx'
import { OwnerError, OwnerLoading, OwnerNotice } from '../../components/OwnerFeedback.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import Card from '../../components/ui/Card.jsx'
import { shipperApi } from '../../services/ownerApi.js'

export default function OwnerShipperPage() {
    const [shippers, setShipper] = useState([])
    const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '' })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [showCreate, setShowCreate] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    const refresh = useCallback(async () => {
        setError('')
        try {
            const data = await shipperApi.list()
            setShipper(Array.isArray(data) ? data : [])
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải danh sách nhân viên')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        let active = true
        async function fetchInitial() {
            try {
                const data = await shipperApi.list()
                if (active) setShipper(Array.isArray(data) ? data : [])
            } catch (err) {
                if (active) setError(err.message || 'Lỗi kết nối máy chủ')
            } finally {
                if (active) setLoading(false)
            }
        }
        fetchInitial()
        return () => {
            active = false
        }
    }, [])

    const stats = useMemo(() => {
        const total = shippers.length
        const active = shippers.filter((s) => s.status === 'active').length
        const inactive = total - active
        return { total, active, inactive }
    }, [shippers])

    const filteredShippers = useMemo(() => {
        return shippers.filter((s) => {
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase()
                const name = (s.name || '').toLowerCase()
                const email = (s.email || '').toLowerCase()
                const phone = (s.phone || '').toLowerCase()
                if (!name.includes(term) && !email.includes(term) && !phone.includes(term)) {
                    return false
                }
            }
            return true
        })
    }, [shippers, searchTerm])

    async function createShipper(event) {
        event.preventDefault()
        setError('')
        setNotice('')
        const payload = {
            ...form,
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim(),
            address: form.address.trim(),
        }
        if (
            payload.name.length < 2 ||
            payload.name.length > 100 ||
            payload.password.length < 8 ||
            payload.password.length > 128 ||
            payload.phone.length > 30 ||
            payload.address.length < 3 ||
            payload.address.length > 500
        ) {
            setError('Kiểm tra độ dài họ tên (2-100), mật khẩu (>=8), địa chỉ và số điện thoại.')
            return
        }
        setSaving(true)
        try {
            const created = await shipperApi.create(payload)
            setForm({ name: '', email: '', password: '', phone: '', address: '' })
            setNotice(`Đã thêm nhân viên ${created.name} vào đội ngũ thành công.`)
            setShowCreate(false)
            await refresh()
        } catch (requestError) {
            setError(requestError.message || 'Không thể tạo nhân viên.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <OwnerPage
            eyebrow="Đội ngũ nhân sự"
            title="Nhân viên giao hàng"
            description="Quản lý tài khoản tài xế thuộc doanh nghiệp của bạn, phân quyền tiếp nhận đơn và mở khóa thùng hàng."
            action={
                <button
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-950/40 transition active:scale-95"
                    onClick={() => setShowCreate((shown) => !shown)}
                    type="button"
                >
                    {showCreate ? (
                        <>
                            <X className="h-4 w-4" />
                            Đóng biểu mẫu
                        </>
                    ) : (
                        <>
                            <UserPlus className="h-4 w-4" />
                            Thêm nhân viên mới
                        </>
                    )}
                </button>
            }
        >
            <OwnerError error={error} onRetry={refresh} />
            {notice && <OwnerNotice>{notice}</OwnerNotice>}

            <div className="space-y-6">
                {/* Bento Metrics */}
                <section className="grid gap-4 grid-cols-2 lg:grid-cols-3">
                    <Card className="flex items-center gap-4 p-4 border-white/10 bg-slate-900/40">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng nhân viên</p>
                            <p className="mt-0.5 text-2xl font-black text-white">{stats.total}</p>
                        </div>
                    </Card>

                    <Card className="flex items-center gap-4 p-4 border-white/10 bg-slate-900/40">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Đang hoạt động</p>
                            <p className="mt-0.5 text-2xl font-black text-emerald-400">{stats.active}</p>
                        </div>
                    </Card>

                    <Card className="flex items-center gap-4 p-4 border-white/10 bg-slate-900/40 col-span-2 lg:col-span-1">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <User className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tạm ngưng / Không hoạt động</p>
                            <p className="mt-0.5 text-2xl font-black text-amber-400">{stats.inactive}</p>
                        </div>
                    </Card>
                </section>

                {/* Create Shipper Form */}
                {showCreate && (
                    <Card className="p-6 border-cyan-500/30 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
                        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                <UserPlus className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Tạo tài khoản nhân viên giao hàng mới</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Tài xế sẽ dùng email và mật khẩu này để đăng nhập vào app Lockship</p>
                            </div>
                        </div>

                        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={createShipper}>
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Họ và tên <span className="text-red-400">*</span>
                                </label>
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                                    maxLength={100}
                                    minLength={2}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Ví dụ: Trần Văn Nam"
                                    required
                                    value={form.name}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Địa chỉ email <span className="text-red-400">*</span>
                                </label>
                                <input
                                    autoComplete="email"
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                                    maxLength={254}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    placeholder="shipper@domain.com"
                                    required
                                    type="email"
                                    value={form.email}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Mật khẩu ban đầu <span className="text-red-400">*</span>
                                </label>
                                <input
                                    autoComplete="new-password"
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                                    maxLength={128}
                                    minLength={8}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="Tối thiểu 8 ký tự"
                                    required
                                    type="password"
                                    value={form.password}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Số điện thoại
                                </label>
                                <input
                                    autoComplete="tel"
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                                    maxLength={30}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    placeholder="+84 901 234 567"
                                    value={form.phone}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Địa chỉ cư trú / Khu vực hoạt động <span className="text-red-400">*</span>
                                </label>
                                <input
                                    autoComplete="street-address"
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                                    maxLength={500}
                                    minLength={3}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    placeholder="Quận 1, TP. Hồ Chí Minh"
                                    required
                                    value={form.address}
                                />
                            </div>

                            <div className="sm:col-span-2 pt-3 border-t border-white/10 flex items-center gap-3">
                                {saving ? (
                                    <OwnerLoading label="Đang tạo tài khoản..." />
                                ) : (
                                    <>
                                        <button
                                            className="rounded-xl bg-cyan-500 hover:bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg transition"
                                            type="submit"
                                        >
                                            Tạo tài khoản tài xế
                                        </button>
                                        <button
                                            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs font-semibold text-slate-300 transition"
                                            onClick={() => setShowCreate(false)}
                                            type="button"
                                        >
                                            Hủy
                                        </button>
                                    </>
                                )}
                            </div>
                        </form>
                    </Card>
                )}

                {/* Search Bar */}
                <Card className="p-4 border-white/10 bg-slate-900/40">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-9 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm nhân viên theo tên, email hoặc số điện thoại..."
                            value={searchTerm}
                        />
                        {searchTerm && (
                            <button
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                onClick={() => setSearchTerm('')}
                                type="button"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </Card>

                {/* Shipper List */}
                {loading ? (
                    <OwnerLoading label="Đang tải danh sách nhân viên giao hàng..." />
                ) : filteredShippers.length === 0 ? (
                    <Card className="p-12 text-center border-dashed border-white/10 bg-slate-900/20">
                        <Users className="mx-auto h-10 w-10 text-slate-600 mb-3" />
                        <p className="text-sm font-semibold text-slate-300">Chưa có nhân viên giao hàng nào</p>
                        <p className="text-xs text-slate-500 mt-1">Bấm nút "Thêm nhân viên mới" ở góc trên để cấp tài khoản cho tài xế</p>
                    </Card>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                        <table className="w-full min-w-[45rem] text-left text-sm">
                            <thead className="border-b border-white/10 bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-slate-400">
                                <tr>
                                    <th className="px-5 py-3.5">Nhân viên giao hàng</th>
                                    <th className="px-5 py-3.5">Số điện thoại</th>
                                    <th className="px-5 py-3.5">Trạng thái</th>
                                    <th className="px-5 py-3.5 text-right">Chi tiết</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredShippers.map((shipper) => (
                                    <tr className="hover:bg-white/[0.02] transition" key={shipper._id}>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                {shipper.avatar ? (
                                                    <img
                                                        alt={shipper.name}
                                                        className="h-9 w-9 rounded-xl object-cover border border-white/10"
                                                        src={shipper.avatar}
                                                    />
                                                ) : (
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold text-xs">
                                                        {(shipper.name || 'S').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-semibold text-white">{shipper.name}</p>
                                                    <p className="text-xs text-slate-400">{shipper.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs text-slate-300 font-mono">
                                            {shipper.phone || '—'}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <StatusPill value={shipper.status} />
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <Link
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
                                                to={`/owner/shippers/${shipper._id}`}
                                            >
                                                Cập nhật
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </OwnerPage>
    )
}