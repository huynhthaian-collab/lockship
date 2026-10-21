import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
    User,
    ArrowLeft,
    Shield,
    Mail,
    Phone,
    MapPin,
    Image,
    Save,
    Trash2,
    Power,
    Slash,
    CheckCircle2,
    Truck,
    Car,
    AlertCircle
} from 'lucide-react'
import AdminPage from '../../components/AdminPage.jsx'
import Card from '../../components/ui/Card.jsx'
import ErrorMessage from '../../components/ErrorMessage.jsx'
import Loading from '../../components/Loading.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import { useAuth } from '../../context/useAuth.js'
import { adminApi } from '../../services/adminApi.js'

export default function AdminUserDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user: currentUser } = useAuth()

    const [user, setUser] = useState(null)
    const [allUser, setAllUser] = useState([])
    const [vehicles, setVehicle] = useState([])
    const [deliveries, setDelivery] = useState([])

    const [profile, setProfile] = useState({ name: '', email: '', phone: '', address: '', avatar: '' })
    const [role, setRole] = useState('owner')
    const [ownerId, setOwnerId] = useState('')

    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)

    const refresh = useCallback(async () => {
        setError('')
        try {
            const [record, users, allVehicle, allDelivery] = await Promise.all([
                adminApi.user(id),
                adminApi.users(),
                adminApi.vehicles().catch(() => []),
                adminApi.deliveries().catch(() => []),
            ])
            setUser(record)
            setAllUser(Array.isArray(users) ? users : [])
            setVehicle(Array.isArray(allVehicle) ? allVehicle : [])
            setDelivery(Array.isArray(allDelivery) ? allDelivery : [])
            setProfile({
                name: record?.name || '',
                email: record?.email || '',
                phone: record?.phone ?? '',
                address: record?.address ?? '',
                avatar: record?.avatar ?? '',
            })
            setRole(record?.role || 'owner')
            setOwnerId(record?.ownerId || '')
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải thông tin người dùng')
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        let active = true
        async function fetchInitial() {
            try {
                const [record, users, allVehicle, allDelivery] = await Promise.all([
                    adminApi.user(id),
                    adminApi.users(),
                    adminApi.vehicles().catch(() => []),
                    adminApi.deliveries().catch(() => []),
                ])
                if (!active) return
                setUser(record)
                setAllUser(Array.isArray(users) ? users : [])
                setVehicle(Array.isArray(allVehicle) ? allVehicle : [])
                setDelivery(Array.isArray(allDelivery) ? allDelivery : [])
                setProfile({
                    name: record?.name || '',
                    email: record?.email || '',
                    phone: record?.phone ?? '',
                    address: record?.address ?? '',
                    avatar: record?.avatar ?? '',
                })
                setRole(record?.role || 'owner')
                setOwnerId(record?.ownerId || '')
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
    }, [id])

    const owners = useMemo(
        () => allUser.filter((item) => item.role === 'owner' && item.status === 'active' && item._id !== id),
        [allUser, id]
    )

    const userMap = useMemo(() => new Map(allUser.map((u) => [u._id, u])), [allUser])
    const isSelf = currentUser?.id === id || currentUser?._id === id

    const userVehicle = useMemo(
        () => (user?.role === 'owner' ? vehicles.filter((v) => v.ownerId === id) : []),
        [vehicles, user?.role, id]
    )

    const userDelivery = useMemo(
        () =>
            deliveries.filter((d) =>
                user?.role === 'owner' ? d.ownerId === id : user?.role === 'shipper' ? d.shipperId === id : false
            ),
        [deliveries, user?.role, id]
    )

    const managedShipper = useMemo(
        () => (user?.role === 'owner' ? allUser.filter((u) => u.ownerId === id && u.role === 'shipper') : []),
        [allUser, user?.role, id]
    )

    async function saveProfile(event) {
        event.preventDefault()
        setBusy(true)
        setError('')
        setNotice('')
        try {
            const payload = {
                name: profile.name.trim(),
                email: profile.email.trim().toLowerCase(),
                phone: profile.phone.trim() || null,
                address: profile.address.trim(),
                avatar: profile.avatar.trim() || null,
            }
            const updated = await adminApi.updateUser(id, payload)
            setUser(updated)
            setNotice('Cập nhật hồ sơ người dùng thành công.')
        } catch (requestError) {
            setError(requestError.message || 'Không thể lưu hồ sơ')
        } finally {
            setBusy(false)
        }
    }

    async function saveRole(event) {
        event.preventDefault()
        if (isSelf) return
        setBusy(true)
        setError('')
        setNotice('')
        try {
            const assignedOwnerId = role === 'shipper' ? (ownerId || null) : undefined
            const updated = await adminApi.setUserRole(id, role, assignedOwnerId)
            setUser(updated)
            const roleLabel = { owner: 'chủ sở hữu', shipper: 'nhân viên giao hàng', admin: 'quản trị viên' }[role] || role
            setNotice(`Đã cập nhật vai trò người dùng thành ${roleLabel}.`)
            await refresh()
        } catch (requestError) {
            setError(requestError.message || 'Không thể thay đổi vai trò')
        } finally {
            setBusy(false)
        }
    }

    async function setStatus(newStatus) {
        if (isSelf) return
        setBusy(true)
        setError('')
        setNotice('')
        try {
            const updated = await adminApi.setUserStatus(id, newStatus)
            setUser(updated)
            const statusLabel = { active: 'đang hoạt động', inactive: 'không hoạt động', suspended: 'bị đình chỉ' }[newStatus] || newStatus
            setNotice(`Đã đổi trạng thái tài khoản thành ${statusLabel}.`)
        } catch (requestError) {
            setError(requestError.message || 'Không thể cập nhật trạng thái')
        } finally {
            setBusy(false)
        }
    }

    async function remove() {
        if (isSelf) return
        if (!window.confirm(`Xóa vĩnh viễn người dùng "${user?.name}"? Thao tác này không thể hoàn tác.`)) {
            return
        }
        setBusy(true)
        setError('')
        try {
            await adminApi.deleteUser(id)
            navigate('/admin/users', { replace: true })
        } catch (requestError) {
            setError(requestError.message || 'Không thể xóa người dùng')
            setBusy(false)
        }
    }

    if (loading) return <Loading label="Đang tải hồ sơ người dùng..." />

    return (
        <AdminPage
            eyebrow="Quản lý người dùng"
            title={user ? user.name : 'Chi tiết người dùng'}
            description={`Tài khoản ID: ${id} • ${user?.email || ''}`}
        >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
                <Link
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
                    to="/admin/users"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Quay lại danh sách người dùng
                </Link>

                {user && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Vai trò:</span>
                        <StatusPill value={user.role} />
                        <span className="text-xs text-slate-400 ml-2">Trạng thái:</span>
                        <StatusPill value={user.status} />
                    </div>
                )}
            </div>

            {error && <ErrorMessage message={error} />}
            {notice && (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 backdrop-blur-md shadow-lg shadow-emerald-950/20 mb-4" role="status">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{notice}</span>
                </div>
            )}

            {user && (
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Cột trái: Hồ sơ & Vai trò & Dữ liệu liên quan */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Profile edit card */}
                        <Card className="p-6 border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                <h3 className="text-base font-bold text-white">Chi tiết hồ sơ</h3>
                                <span className="text-xs text-slate-400 font-mono">
                                    Tạo: {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
                                </span>
                            </div>

                            <form className="mt-5 space-y-4" onSubmit={saveProfile}>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                            Họ và tên <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <input
                                                className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                                                maxLength={100}
                                                minLength={2}
                                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                                required
                                                value={profile.name}
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
                                                className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                                                maxLength={254}
                                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                                required
                                                type="email"
                                                value={profile.email}
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
                                                className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                                                maxLength={30}
                                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                                placeholder="+84 901 234 567"
                                                value={profile.phone}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                            Địa chỉ
                                        </label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <input
                                                autoComplete="street-address"
                                                className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                                                maxLength={500}
                                                minLength={3}
                                                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                                required
                                                value={profile.address}
                                            />
                                        </div>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                            Đường dẫn ảnh đại diện
                                        </label>
                                        <div className="relative">
                                            <Image className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <input
                                                className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                                                maxLength={2048}
                                                onChange={(e) => setProfile({ ...profile, avatar: e.target.value })}
                                                placeholder="https://..."
                                                type="url"
                                                value={profile.avatar}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-white/10">
                                    <button
                                        className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-950/40 transition disabled:opacity-50"
                                        disabled={busy}
                                        type="submit"
                                    >
                                        <Save className="h-4 w-4" />
                                        {busy ? 'Đang lưu...' : 'Cập nhật hồ sơ'}
                                    </button>
                                </div>
                            </form>
                        </Card>

                        {/* Role Assignment Card */}
                        <Card className="p-6 border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                <div>
                                    <h3 className="text-base font-bold text-white">Quản lý vai trò & Phân quyền</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Thiết lập quyền truy cập và phân công quản lý</p>
                                </div>
                                <StatusPill value={user.role} />
                            </div>

                            {isSelf ? (
                                <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300">
                                    Bạn đang đăng nhập bằng tài khoản này nên không thể tự thay đổi vai trò của chính mình.
                                </p>
                            ) : (
                                <form className="mt-5 space-y-4" onSubmit={saveRole}>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                            Vai trò hệ thống
                                        </label>
                                        <select
                                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-purple-500/50 focus:outline-none"
                                            onChange={(e) => setRole(e.target.value)}
                                            value={role}
                                        >
                                            <option value="owner">Chủ sở hữu (Quản lý đội xe)</option>
                                            <option value="shipper">Nhân viên giao hàng (Shipper)</option>
                                            <option value="admin">Quản trị viên (Admin)</option>
                                        </select>
                                    </div>

                                    {role === 'shipper' && (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                                Chủ sở hữu quản lý trực tiếp
                                            </label>
                                            <select
                                                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-purple-500/50 focus:outline-none"
                                                onChange={(e) => setOwnerId(e.target.value)}
                                                value={ownerId}
                                            >
                                                <option value="">Chưa phân công chủ sở hữu</option>
                                                {owners.map((owner) => (
                                                    <option key={owner._id} value={owner._id}>
                                                        {owner.name} ({owner.email})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <button
                                            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition disabled:opacity-50"
                                            disabled={busy}
                                            type="submit"
                                        >
                                            <Shield className="h-4 w-4" />
                                            {busy ? 'Đang cập nhật...' : 'Áp dụng vai trò mới'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </Card>

                        {/* Owner Fleet preview if owner */}
                        {user.role === 'owner' && (
                            <Card className="p-6 border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                                <h3 className="text-base font-bold text-white mb-4">Đội xe & Nhân sự trực thuộc</h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                            <span className="text-xs font-semibold text-slate-400">Phương tiện ({userVehicle.length})</span>
                                            <Car className="h-4 w-4 text-cyan-400" />
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            {userVehicle.slice(0, 4).map((v) => (
                                                <div key={v._id} className="flex items-center justify-between text-xs">
                                                    <span className="font-mono font-bold text-white">{v.plateNumber}</span>
                                                    <span className="text-slate-400">{v.type}</span>
                                                </div>
                                            ))}
                                            {userVehicle.length === 0 && (
                                                <p className="text-xs text-slate-500 italic">Chưa đăng ký phương tiện</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                            <span className="text-xs font-semibold text-slate-400">Shipper trực thuộc ({managedShipper.length})</span>
                                            <Truck className="h-4 w-4 text-emerald-400" />
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            {managedShipper.slice(0, 4).map((s) => (
                                                <div key={s._id} className="flex items-center justify-between text-xs">
                                                    <Link to={`/admin/users/${s._id}`} className="font-medium text-cyan-400 hover:underline">
                                                        {s.name}
                                                    </Link>
                                                    <StatusPill value={s.status} />
                                                </div>
                                            ))}
                                            {managedShipper.length === 0 && (
                                                <p className="text-xs text-slate-500 italic">Chưa có tài xế trực thuộc</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Cột phải: Trạng thái tài khoản & Danger Zone */}
                    <div className="space-y-6">
                        {/* Status Card */}
                        <Card className="p-6 border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                <h3 className="text-base font-bold text-white">Trạng thái tài khoản</h3>
                                <StatusPill value={user.status} />
                            </div>

                            <p className="mt-4 text-xs text-slate-400 leading-relaxed">
                                {user.status === 'active' && 'Tài khoản đang hoạt động bình thường trên toàn hệ thống.'}
                                {user.status === 'inactive' && 'Tài khoản đang tạm ngưng hoạt động. Người dùng không thể đăng nhập.'}
                                {user.status === 'suspended' && 'Tài khoản đã bị đình chỉ do vi phạm hoặc quyết định quản trị.'}
                            </p>

                            {isSelf ? (
                                <p className="mt-4 text-xs text-slate-500 italic">
                                    Bạn không thể thay đổi trạng thái của chính mình.
                                </p>
                            ) : (
                                <div className="mt-5 space-y-2">
                                    {user.status !== 'active' && (
                                        <button
                                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white transition disabled:opacity-50"
                                            disabled={busy}
                                            onClick={() => setStatus('active')}
                                            type="button"
                                        >
                                            <Power className="h-4 w-4" />
                                            Kích hoạt tài khoản
                                        </button>
                                    )}
                                    {user.status !== 'inactive' && (
                                        <button
                                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 py-2.5 text-xs font-bold text-slate-300 transition disabled:opacity-50"
                                            disabled={busy}
                                            onClick={() => setStatus('inactive')}
                                            type="button"
                                        >
                                            <Power className="h-4 w-4" />
                                            Ngừng kích hoạt
                                        </button>
                                    )}
                                    {user.status !== 'suspended' && (
                                        <button
                                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 py-2.5 text-xs font-bold text-amber-400 transition disabled:opacity-50"
                                            disabled={busy}
                                            onClick={() => setStatus('suspended')}
                                            type="button"
                                        >
                                            <Slash className="h-4 w-4" />
                                            Đình chỉ tài khoản
                                        </button>
                                    )}
                                </div>
                            )}
                        </Card>

                        {/* Danger Zone */}
                        <Card className="p-6 border-red-500/30 bg-red-500/[0.04] backdrop-blur-xl shadow-2xl">
                            <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Khu vực nguy hiểm
                            </h3>
                            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                                Xóa tài khoản sẽ loại bỏ vĩnh viễn dữ liệu người dùng khỏi cơ sở dữ liệu.
                            </p>
                            <div className="mt-4">
                                <button
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 py-2.5 text-xs font-bold text-red-400 transition disabled:opacity-50"
                                    disabled={busy || isSelf}
                                    onClick={remove}
                                    type="button"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    {isSelf ? 'Không thể tự xóa' : 'Xóa tài khoản vĩnh viễn'}
                                </button>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </AdminPage>
    )
}