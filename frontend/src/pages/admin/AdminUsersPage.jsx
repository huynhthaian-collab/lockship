import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Users,
    UserPlus,
    Shield,
    Truck,
    Briefcase,
    Search,
    CheckCircle2,
    X,
    Lock,
    Mail,
    Phone,
    User,
    Power,
    Slash,
    Trash2
} from 'lucide-react'
import AdminPage from '../../components/AdminPage.jsx'
import Card from '../../components/ui/Card.jsx'
import ErrorMessage from '../../components/ErrorMessage.jsx'
import Loading from '../../components/Loading.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import { useAuth } from '../../context/useAuth.js'
import { adminApi } from '../../services/adminApi.js'

const emptyForm = { name: '', email: '', password: '', phone: '', role: 'owner', ownerId: '' }

export default function AdminUserPage() {
    const { user: currentUser } = useAuth()
    const [users, setUser] = useState([])
    const [form, setForm] = useState(emptyForm)
    const [roleFilter, setRoleFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [actionId, setActionId] = useState(null)
    const [showCreate, setShowCreate] = useState(false)

    const refresh = useCallback(async () => {
        setError('')
        try {
            const data = await adminApi.users()
            setUser(Array.isArray(data) ? data : [])
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải danh sách người dùng')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        let active = true
        async function fetchInitial() {
            try {
                const data = await adminApi.users()
                if (active) setUser(Array.isArray(data) ? data : [])
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

    const owners = useMemo(
        () => users.filter((u) => u.role === 'owner' && u.status === 'active'),
        [users]
    )

    const userMap = useMemo(() => new Map(users.map((u) => [u._id, u])), [users])

    const stats = useMemo(() => {
        const total = users.length
        const ownerCount = users.filter((u) => u.role === 'owner').length
        const shipperCount = users.filter((u) => u.role === 'shipper').length
        const adminCount = users.filter((u) => u.role === 'admin').length
        return { total, ownerCount, shipperCount, adminCount }
    }, [users])

    const filteredUser = useMemo(() => {
        return users.filter((item) => {
            if (roleFilter !== 'all' && item.role !== roleFilter) return false
            if (statusFilter !== 'all' && item.status !== statusFilter) return false
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase()
                const name = (item.name || '').toLowerCase()
                const email = (item.email || '').toLowerCase()
                const phone = (item.phone || '').toLowerCase()
                if (!name.includes(term) && !email.includes(term) && !phone.includes(term)) {
                    return false
                }
            }
            return true
        })
    }, [users, roleFilter, statusFilter, searchTerm])

    async function createUser(event) {
        event.preventDefault()
        setError('')
        setNotice('')
        const payload = {
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
            role: form.role,
            phone: form.phone.trim() || undefined,
            ownerId: form.role === 'shipper' ? form.ownerId : undefined,
        }

        if (payload.name.length < 2 || payload.name.length > 100) {
            setError('Họ tên phải có từ 2 đến 100 ký tự.')
            return
        }
        if (payload.password.length < 8 || payload.password.length > 128) {
            setError('Mật khẩu phải có từ 8 đến 128 ký tự.')
            return
        }
        if (payload.role === 'shipper' && !payload.ownerId) {
            setError('Hãy chọn chủ sở hữu đang hoạt động để quản lý nhân viên giao hàng này.')
            return
        }

        setSaving(true)
        try {
            const created = await adminApi.createUser(payload)
            setNotice(`Đã tạo người dùng ${created.name} (${created.role}) thành công.`)
            setForm(emptyForm)
            setShowCreate(false)
            await refresh()
        } catch (requestError) {
            setError(requestError.message || 'Không thể tạo tài khoản')
        } finally {
            setSaving(false)
        }
    }

    async function handleStatusChange(targetUser, newStatus) {
        if (targetUser._id === currentUser?.id || targetUser._id === currentUser?._id) {
            setError('Bạn không thể thay đổi trạng thái của chính mình.')
            return
        }
        setError('')
        setNotice('')
        setActionId(targetUser._id)
        try {
            await adminApi.setUserStatus(targetUser._id, newStatus)
            const statusLabel = { active: 'đang hoạt động', inactive: 'không hoạt động', suspended: 'bị đình chỉ' }[newStatus] || newStatus
            setNotice(`Đã cập nhật trạng thái của ${targetUser.name} thành ${statusLabel}.`)
            await refresh()
        } catch (requestError) {
            setError(requestError.message || 'Không thể cập nhật trạng thái')
        } finally {
            setActionId(null)
        }
    }

    async function handleDeleteUser(targetUser) {
        if (targetUser._id === currentUser?.id || targetUser._id === currentUser?._id) {
            setError('Bạn không thể xóa tài khoản quản trị viên của chính mình.')
            return
        }
        if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn người dùng "${targetUser.name}" (${targetUser.email}) không?`)) {
            return
        }
        setError('')
        setNotice('')
        setActionId(targetUser._id)
        try {
            await adminApi.deleteUser(targetUser._id)
            setNotice(`Đã xóa người dùng "${targetUser.name}".`)
            await refresh()
        } catch (requestError) {
            setError(requestError.message || 'Không thể xóa tài khoản')
        } finally {
            setActionId(null)
        }
    }

    const getRoleBadge = (role) => {
        switch (role) {
            case 'admin':
                return 'bg-purple-500/10 text-purple-300 border-purple-500/30'
            case 'owner':
                return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
            case 'shipper':
                return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            default:
                return 'bg-slate-500/10 text-slate-300 border-slate-500/30'
        }
    }

    return (
        <AdminPage
            eyebrow="Kiểm soát truy cập"
            title="Quản lý người dùng"
            description="Phân quyền theo vai trò (Admin, Chủ sở hữu, Shipper), kích hoạt tài khoản và quản trị đội ngũ."
            action={
                <button
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-950/40 transition active:scale-95"
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
                            Thêm người dùng
                        </>
                    )}
                </button>
            }
        >
            {error && <ErrorMessage message={error} />}
            {notice && (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 backdrop-blur-md shadow-lg shadow-emerald-950/20" role="status">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{notice}</span>
                </div>
            )}

            {/* Bento Summary Stats */}
            <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="flex items-center gap-4 p-4 border-white/10 bg-slate-900/40">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng tài khoản</p>
                        <p className="mt-0.5 text-2xl font-black text-white">{stats.total}</p>
                    </div>
                </Card>

                <Card className="flex items-center gap-4 p-4 border-white/10 bg-slate-900/40">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Chủ sở hữu</p>
                        <p className="mt-0.5 text-2xl font-black text-cyan-400">{stats.ownerCount}</p>
                    </div>
                </Card>

                <Card className="flex items-center gap-4 p-4 border-white/10 bg-slate-900/40">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Truck className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Shipper</p>
                        <p className="mt-0.5 text-2xl font-black text-emerald-400">{stats.shipperCount}</p>
                    </div>
                </Card>

                <Card className="flex items-center gap-4 p-4 border-white/10 bg-slate-900/40">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <Shield className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Quản trị viên</p>
                        <p className="mt-0.5 text-2xl font-black text-rose-400">{stats.adminCount}</p>
                    </div>
                </Card>
            </section>

            {/* Create user form */}
            {showCreate && (
                <Card className="p-6 border-purple-500/30 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
                        <UserPlus className="h-5 w-5 text-purple-400" />
                        <h2 className="text-base font-bold text-white">Đăng ký tài khoản người dùng mới</h2>
                    </div>
                    <form className="mt-4 space-y-4" onSubmit={createUser}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Họ và tên <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none"
                                        maxLength={100}
                                        minLength={2}
                                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                                        placeholder="Nguyễn Văn A"
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
                                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none"
                                        maxLength={254}
                                        onChange={(event) => setForm({ ...form, email: event.target.value })}
                                        placeholder="user@lockship.io"
                                        required
                                        type="email"
                                        value={form.email}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Mật khẩu ban đầu <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        autoComplete="new-password"
                                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none"
                                        maxLength={128}
                                        minLength={8}
                                        onChange={(event) => setForm({ ...form, password: event.target.value })}
                                        placeholder="Tối thiểu 8 ký tự"
                                        required
                                        type="password"
                                        value={form.password}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Số điện thoại
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none"
                                        maxLength={30}
                                        onChange={(event) => setForm({ ...form, phone: event.target.value })}
                                        placeholder="+84 901 234 567"
                                        value={form.phone}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Vai trò hệ thống <span className="text-red-400">*</span>
                                </label>
                                <select
                                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500/50 focus:outline-none"
                                    onChange={(event) => setForm({ ...form, role: event.target.value, ownerId: '' })}
                                    value={form.role}
                                >
                                    <option value="owner">Chủ sở hữu (Chủ phương tiện / Đội xe)</option>
                                    <option value="shipper">Nhân viên giao hàng (Shipper)</option>
                                    <option value="admin">Quản trị viên (Admin)</option>
                                </select>
                            </div>

                            {form.role === 'shipper' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                        Chủ sở hữu quản lý <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500/50 focus:outline-none"
                                        onChange={(event) => setForm({ ...form, ownerId: event.target.value })}
                                        required
                                        value={form.ownerId}
                                    >
                                        <option value="">Chọn chủ sở hữu...</option>
                                        {owners.map((owner) => (
                                            <option key={owner._id} value={owner._id}>
                                                {owner.name} ({owner.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                            {saving ? (
                                <Loading label="Đang tạo tài khoản..." />
                            ) : (
                                <>
                                    <button
                                        className="rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white shadow-lg transition"
                                        type="submit"
                                    >
                                        Tạo tài khoản
                                    </button>
                                    <button
                                        className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition"
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

            {/* Filter & Search Bar */}
            <Card className="p-4 border-white/10 bg-slate-900/40">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-9 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none"
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Tìm theo tên, email hoặc số điện thoại..."
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

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-400">Vai trò:</span>
                            <select
                                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs text-white focus:border-purple-500/50 focus:outline-none"
                                onChange={(e) => setRoleFilter(e.target.value)}
                                value={roleFilter}
                            >
                                <option value="all">Tất cả vai trò</option>
                                <option value="owner">Chủ sở hữu</option>
                                <option value="shipper">Shipper</option>
                                <option value="admin">Quản trị viên</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-400">Trạng thái:</span>
                            <select
                                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs text-white focus:border-purple-500/50 focus:outline-none"
                                onChange={(e) => setStatusFilter(e.target.value)}
                                value={statusFilter}
                            >
                                <option value="all">Tất cả trạng thái</option>
                                <option value="active">Đang hoạt động</option>
                                <option value="inactive">Không hoạt động</option>
                                <option value="suspended">Đã đình chỉ</option>
                            </select>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Users table */}
            {loading ? (
                <Loading label="Đang tải danh sách người dùng..." />
            ) : filteredUser.length === 0 ? (
                <Card className="p-12 text-center border-dashed border-white/10 bg-slate-900/20">
                    <Users className="mx-auto h-10 w-10 text-slate-600 mb-3" />
                    <p className="text-sm font-semibold text-slate-300">Không tìm thấy người dùng phù hợp</p>
                    <p className="text-xs text-slate-500 mt-1">Hãy thử tìm kiếm với từ khóa khác</p>
                </Card>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                    <table className="w-full min-w-[55rem] text-left text-sm">
                        <thead className="border-b border-white/10 bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-slate-400">
                            <tr>
                                <th className="px-5 py-3.5">Người dùng</th>
                                <th className="px-5 py-3.5">Vai trò</th>
                                <th className="px-5 py-3.5">Chủ sở hữu quản lý</th>
                                <th className="px-5 py-3.5">Trạng thái</th>
                                <th className="px-5 py-3.5">Ngày tạo</th>
                                <th className="px-5 py-3.5 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUser.map((item) => {
                                const isSelf = item._id === currentUser?.id || item._id === currentUser?._id
                                const assignedOwner = item.ownerId ? userMap.get(item.ownerId) : null
                                const isBusy = actionId === item._id

                                return (
                                    <tr className="hover:bg-white/[0.02] transition" key={item._id}>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                {item.avatar ? (
                                                    <img
                                                        alt={item.name}
                                                        className="h-9 w-9 rounded-full object-cover border border-white/10"
                                                        src={item.avatar}
                                                    />
                                                ) : (
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 font-bold text-purple-300 text-xs">
                                                        {(item.name || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-semibold text-white">
                                                        {item.name || 'Người dùng'} {isSelf && <span className="text-xs text-cyan-400 font-normal">(Bạn)</span>}
                                                    </p>
                                                    <p className="text-xs text-slate-400">{item.email}</p>
                                                    {item.phone && <p className="text-[11px] text-slate-500">{item.phone}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${getRoleBadge(item.role)}`}>
                                                {{ owner: 'Chủ sở hữu', shipper: 'Shipper', admin: 'Quản trị viên' }[item.role] || item.role}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs text-slate-400">
                                            {item.role === 'shipper' ? (
                                                assignedOwner ? (
                                                    <Link to={`/admin/users/${assignedOwner._id}`} className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline">
                                                        {assignedOwner.name}
                                                    </Link>
                                                ) : (
                                                    <span className="text-amber-400 italic">Chưa phân công</span>
                                                )
                                            ) : (
                                                <span className="text-slate-600">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <StatusPill value={item.status} />
                                        </td>
                                        <td className="px-5 py-3.5 text-xs text-slate-400">
                                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—'}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {!isSelf && (
                                                    <>
                                                        {item.status !== 'active' ? (
                                                            <button
                                                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
                                                                disabled={isBusy}
                                                                onClick={() => handleStatusChange(item, 'active')}
                                                                title="Kích hoạt tài khoản"
                                                                type="button"
                                                            >
                                                                <Power className="h-3 w-3" />
                                                                Kích hoạt
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-white/10 transition disabled:opacity-50"
                                                                disabled={isBusy}
                                                                onClick={() => handleStatusChange(item, 'inactive')}
                                                                title="Ngừng hoạt động"
                                                                type="button"
                                                            >
                                                                <Power className="h-3 w-3" />
                                                                Ngừng
                                                            </button>
                                                        )}
                                                        {item.status !== 'suspended' && (
                                                            <button
                                                                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition disabled:opacity-50"
                                                                disabled={isBusy}
                                                                onClick={() => handleStatusChange(item, 'suspended')}
                                                                title="Đình chỉ tài khoản"
                                                                type="button"
                                                            >
                                                                <Slash className="h-3 w-3" />
                                                                Đình chỉ
                                                            </button>
                                                        )}
                                                    </>
                                                )}

                                                <Link
                                                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition"
                                                    to={`/admin/users/${item._id}`}
                                                >
                                                    Quản lý
                                                </Link>

                                                {!isSelf && (
                                                    <button
                                                        className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs font-bold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                                                        disabled={isBusy}
                                                        onClick={() => handleDeleteUser(item)}
                                                        type="button"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                        Xóa
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </AdminPage>
    )
}