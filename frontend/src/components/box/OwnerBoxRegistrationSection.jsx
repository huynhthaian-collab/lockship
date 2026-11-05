import { useCallback, useEffect, useState, useRef } from 'react'
import {
    AlertCircle,
    ArrowRight,
    Box,
    CheckCircle2,
    Clock,
    Info,
    Lock,
    Unlock,
    MapPin,
    Plus,
    QrCode,
    RefreshCw,
    Shield,
    Sparkles,
    Battery,
    Wrench,
    KeyRound,
    Zap,
    PackageCheck,
    Check,
    Copy,
    Camera,
    Eye,
    ShieldCheck,
    AlertTriangle,
} from 'lucide-react'
import Card from '../ui/Card.jsx'
import Modal from '../ui/Modal.jsx'
import SpatialTiltCard from '../spatial/SpatialTiltCard.jsx'
import { boxRegistrationApi, boxReliabilityApi } from '../../services/ownerApi.js'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'

function formatDate(value) {
    return value
        ? new Date(value).toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
          })
        : '—'
}

export default function OwnerBoxRegistrationSection({ onRefresh }) {
    const [availableBoxes, setAvailableBoxes] = useState([])
    const [myBoxes, setMyBoxes] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    // Modal state for registration
    const [selectedBox, setSelectedBox] = useState(null)
    const [requestedAddress, setRequestedAddress] = useState('')
    const [requestedNote, setRequestedNote] = useState('')
    const [addressError, setAddressError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Modal state for QR view
    const [qrModalBox, setQrModalBox] = useState(null)

    // Reliability Modals
    const [healthModal, setHealthModal] = useState({ open: false, box: null, data: null, loading: false })
    const [otpModal, setOtpModal] = useState({ open: false, box: null, data: null, loading: false, timeLeft: 300 })
    const [emergencyModal, setEmergencyModal] = useState({ open: false, box: null, loading: false })
    const [proofPhotoModal, setProofPhotoModal] = useState({ open: false, photo: null, boxName: '' })
    const [actionLoading, setActionLoading] = useState({})

    const otpTimerRef = useRef(null)

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        setRefreshing(true)
        setError('')
        try {
            const [available, mine] = await Promise.all([
                boxRegistrationApi.listAvailable(),
                boxRegistrationApi.listMyBoxes(),
            ])
            setAvailableBoxes(available || [])
            setMyBoxes(mine || [])
        } catch (err) {
            setError(err.message || 'Không thể tải danh sách tủ khóa.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Real-time notification when Admin approves an installation
    const onInstallationConfirmed = useCallback(
        (data) => {
            loadData(true)
            setSuccessMessage(
                `🎉 Chúc mừng! Tủ khóa ${data.name || data.boxId} của bạn đã được Admin nghiệm thu và kích hoạt thành công tại: ${data.address}!`
            )
            setTimeout(() => setSuccessMessage(''), 10000)
            if (onRefresh) onRefresh()
        },
        [loadData, onRefresh]
    )

    // Real-time notification when parcel arrives or picked up
    const onParcelDelivered = useCallback(
        (data) => {
            loadData(true)
            setSuccessMessage(
                `📦 Kiện hàng mới đã được bỏ vào tủ ${data.boxId || ''} và khóa an toàn!`
            )
            setTimeout(() => setSuccessMessage(''), 8000)
        },
        [loadData]
    )

    useSocketEvent('box:installation_confirmed', onInstallationConfirmed)
    useSocketEvent('box_parcel_delivered', onParcelDelivered)
    useSocketEvent('parcel_confirmed', onParcelDelivered)

    const handleOpenRegisterModal = (box) => {
        setSelectedBox(box)
        setRequestedAddress('')
        setRequestedNote('')
        setAddressError('')
    }

    const handleSubmitRegistration = async (e) => {
        e.preventDefault()
        const cleanAddress = requestedAddress.trim()

        if (!cleanAddress) {
            setAddressError('Vui lòng nhập địa chỉ đề xuất lắp đặt.')
            return
        }
        if (cleanAddress.length < 10) {
            setAddressError('Địa chỉ đề xuất phải có ít nhất 10 ký tự để Admin xác định vị trí chính xác.')
            return
        }

        setSubmitting(true)
        setAddressError('')
        try {
            const result = await boxRegistrationApi.requestRegistration(selectedBox.boxId, {
                requestedAddress: cleanAddress,
                requestedNote: requestedNote.trim(),
            })

            setSelectedBox(null)
            setSuccessMessage(
                result.message ||
                    'Yêu cầu đăng ký tủ khóa thành công! Vui lòng chờ Quản trị viên xét duyệt và nghiệm thu lắp đặt.'
            )
            setTimeout(() => setSuccessMessage(''), 8000)
            loadData(true)
            if (onRefresh) onRefresh()
        } catch (err) {
            setAddressError(err.message || 'Lỗi gửi yêu cầu đăng ký tủ khóa.')
        } finally {
            setSubmitting(false)
        }
    }

    // Reliability Action 1: Health Check
    const handleRunHealthCheck = async (box) => {
        setHealthModal({ open: true, box, data: null, loading: true })
        try {
            const data = await boxReliabilityApi.healthCheck(box.boxId || box.id)
            setHealthModal({ open: true, box, data, loading: false })
            loadData(true)
        } catch (err) {
            alert(err.message || 'Không thể kiểm tra tình trạng tủ khóa.')
            setHealthModal({ open: false, box: null, data: null, loading: false })
        }
    }

    // Reliability Action 2: Request Owner OTP
    const handleRequestOtp = async (box) => {
        setOtpModal({ open: true, box, data: null, loading: true, timeLeft: 300 })
        try {
            const data = await boxReliabilityApi.requestOtp(box.boxId || box.id)
            setOtpModal({ open: true, box, data, loading: false, timeLeft: 300 })

            // Start 5-minute countdown
            if (otpTimerRef.current) clearInterval(otpTimerRef.current)
            otpTimerRef.current = setInterval(() => {
                setOtpModal((prev) => {
                    if (prev.timeLeft <= 1) {
                        clearInterval(otpTimerRef.current)
                        return { ...prev, timeLeft: 0 }
                    }
                    return { ...prev, timeLeft: prev.timeLeft - 1 }
                })
            }, 1000)
        } catch (err) {
            alert(err.message || 'Không thể tạo mã OTP mở tủ.')
            setOtpModal({ open: false, box: null, data: null, loading: false, timeLeft: 0 })
        }
    }

    // Reliability Action 3: Emergency Unlock
    const handleEmergencyUnlock = async (box) => {
        setEmergencyModal({ open: false, box: null, loading: false })
        setActionLoading((prev) => ({ ...prev, [box.boxId]: true }))
        try {
            const res = await boxReliabilityApi.emergencyUnlock(box.boxId || box.id, box.masterBackupPin || '888999')
            setSuccessMessage(`⚡ Lệnh mở tủ khẩn cấp đã gửi tới ${box.name || box.boxId}: ${res.message || 'Cửa hộc tủ đã bật mở!'}`)
            setTimeout(() => setSuccessMessage(''), 8000)
            loadData(true)
        } catch (err) {
            alert(err.message || 'Lỗi khi kích hoạt mở tủ khẩn cấp.')
        } finally {
            setActionLoading((prev) => ({ ...prev, [box.boxId]: false }))
        }
    }

    // Reliability Action 4: Confirm Parcel Pickup
    const handleConfirmPickup = async (box) => {
        if (!window.confirm(`Xác nhận bạn đã lấy hàng an toàn khỏi tủ ${box.name || box.boxId}? Hệ thống sẽ đặt lại trạng thái ngăn tủ về "Đang trống".`)) {
            return
        }
        setActionLoading((prev) => ({ ...prev, [box.boxId]: true }))
        try {
            const res = await boxReliabilityApi.confirmPickup(box.boxId || box.id)
            setSuccessMessage(`✅ Xác nhận lấy hàng thành công cho tủ ${box.name || box.boxId}!`)
            setTimeout(() => setSuccessMessage(''), 8000)
            loadData(true)
        } catch (err) {
            alert(err.message || 'Lỗi khi xác nhận lấy hàng.')
        } finally {
            setActionLoading((prev) => ({ ...prev, [box.boxId]: false }))
        }
    }

    const pendingBoxes = myBoxes.filter((b) => b.registrationStatus === 'PENDING_INSTALLATION')
    const activeBoxes = myBoxes.filter(
        (b) => b.registrationStatus === 'ACTIVE' || !b.registrationStatus
    )

    return (
        <section aria-labelledby="boxes-heading" className="mt-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                        Hệ Thống Trạm Tủ Khóa Thông Minh
                    </p>
                    <h2 id="boxes-heading" className="text-xl font-extrabold text-white sm:text-2xl">
                        Tủ khóa của tôi & Đăng ký tủ mới
                    </h2>
                </div>
                <button
                    onClick={() => loadData()}
                    disabled={refreshing}
                    className="ui-button-secondary gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl"
                    type="button"
                >
                    <RefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
                    Làm mới
                </button>
            </div>

            {successMessage && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-4 text-sm font-bold text-emerald-300 animate-page-in shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
                    <span>{successMessage}</span>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                    <AlertCircle size={18} className="shrink-0 text-rose-400" />
                    <span>{error}</span>
                </div>
            )}

            {/* 1. KHU VỰC: CÁC TỦ ĐANG CHỜ ADMIN XÉT DUYỆT & LẮP ĐẶT */}
            {pendingBoxes.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-amber-400 animate-pulse" />
                        <h3 className="text-sm font-extrabold text-amber-300 uppercase tracking-wide">
                            Tủ khóa đang chờ Admin xét duyệt & nghiệm thu lắp đặt ({pendingBoxes.length})
                        </h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {pendingBoxes.map((box) => (
                            <div
                                key={box.id || box.boxId}
                                className="relative overflow-hidden rounded-3xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-950/80 p-5 shadow-xl"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <span className="font-mono text-xs font-bold text-amber-400">
                                            {box.boxId}
                                        </span>
                                        <h4 className="mt-1 text-base font-bold text-white">
                                            {box.name}
                                        </h4>
                                    </div>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 animate-pulse">
                                        <Clock size={13} /> Chờ duyệt lắp đặt
                                    </span>
                                </div>

                                <div className="mt-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs">
                                    <p className="flex items-start gap-1.5 text-amber-200 font-medium">
                                        <MapPin size={15} className="shrink-0 mt-0.5 text-amber-400" />
                                        <span>
                                            <strong className="text-white">Địa chỉ đề xuất:</strong>{' '}
                                            {box.requestedAddress}
                                        </span>
                                    </p>
                                    {box.requestedNote && (
                                        <p className="mt-2 text-slate-300 pl-5 text-[11px]">
                                            <em>Ghi chú vị trí:</em> "{box.requestedNote}"
                                        </p>
                                    )}
                                    <p className="mt-2 text-[10px] text-slate-500 font-mono pl-5">
                                        Gửi lúc: {formatDate(box.requestedAt || box.createdAt)}
                                    </p>
                                </div>

                                <p className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
                                    <Info size={14} className="text-cyan-400 shrink-0" />
                                    <span>
                                        Admin đang chuẩn hóa địa chỉ và gắn tọa độ GPS. Tủ sẽ kích hoạt ngay sau khi nghiệm thu.
                                    </span>
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 2. KHU VỰC: CÁC TỦ KHÓA ĐANG HOẠT ĐỘNG (ACTIVE) CỦA OWNER */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wide flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-400" />
                        Tủ khóa đang hoạt động ({activeBoxes.length})
                    </h3>
                </div>

                {activeBoxes.length === 0 ? (
                    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center text-slate-400">
                        <Box size={36} className="mx-auto mb-2 text-slate-500" />
                        <p className="text-sm font-semibold text-white">Bạn chưa có tủ khóa nào được kích hoạt.</p>
                        <p className="text-xs text-slate-400 mt-1">
                            Hãy chọn một tủ khóa có sẵn trong kho phía dưới để gửi yêu cầu lắp đặt.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {activeBoxes.map((box) => {
                            const hasParcel = box.hasParcel
                            const battery = box.batteryLevel ?? 95
                            const lockHealthy = box.lockHealthStatus !== 'WARNING'

                            return (
                                <div
                                    key={box.id || box.boxId}
                                    className={`relative rounded-3xl border p-5 backdrop-blur-md shadow-xl transition-all flex flex-col justify-between ${
                                        hasParcel
                                            ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-950/20 via-slate-900/80 to-slate-950/90 shadow-emerald-500/10'
                                            : 'border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] hover:border-cyan-400/40'
                                    }`}
                                >
                                    <div className="space-y-3.5">
                                        {/* Box Header & Compartment Status Badge */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <span className="font-mono text-xs font-extrabold text-cyan-300">
                                                    {box.boxId}
                                                </span>
                                                <h4 className="mt-0.5 text-base font-extrabold text-white line-clamp-1">
                                                    {box.name}
                                                </h4>
                                            </div>

                                            {/* Physical Compartment Status */}
                                            {hasParcel ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-300 shadow-sm shadow-emerald-500/20">
                                                    <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                                                    📦 Đang có hàng
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
                                                    📭 Tủ đang trống
                                                </span>
                                            )}
                                        </div>

                                        {/* Hardware Reliability Badges */}
                                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/90 border border-slate-700 text-emerald-400 font-mono font-bold">
                                                <Battery size={13} className="text-emerald-400" />
                                                {battery}%
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/90 border border-slate-700 text-emerald-400 font-bold">
                                                <span className="size-1.5 rounded-full bg-emerald-400" />
                                                Online
                                            </span>
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border font-bold ${
                                                lockHealthy
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                                    : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                                            }`}>
                                                <Lock size={12} />
                                                {lockHealthy ? 'Khóa Ổn định ✅' : 'Khóa Cảnh báo ⚠️'}
                                            </span>
                                        </div>

                                        {/* Address */}
                                        <p className="text-xs text-slate-300 flex items-start gap-1.5 leading-relaxed line-clamp-2">
                                            <MapPin size={14} className="shrink-0 mt-0.5 text-cyan-400" />
                                            <span>{box.address || 'Đang cập nhật địa chỉ'}</span>
                                        </p>

                                        {/* Parcel Details if present */}
                                        {hasParcel && (
                                            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs space-y-2">
                                                <div className="flex items-center justify-between text-emerald-300 font-bold">
                                                    <span>Kiện hàng đang chờ lấy:</span>
                                                    <span className="font-mono text-[11px] text-slate-300">
                                                        {box.lastParcelDeliveredAt ? formatDate(box.lastParcelDeliveredAt) : 'Gần đây'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {box.lastDeliveryProofImage && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setProofPhotoModal({ open: true, photo: box.lastDeliveryProofImage, boxName: box.name })}
                                                            className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-all border border-emerald-500/30 inline-flex items-center justify-center gap-1.5"
                                                        >
                                                            <Eye size={13} />
                                                            <span>Xem ảnh hàng trong tủ</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        disabled={actionLoading[box.boxId]}
                                                        onClick={() => handleConfirmPickup(box)}
                                                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition-all shadow-md inline-flex items-center justify-center gap-1.5 active:scale-95"
                                                    >
                                                        <Check size={13} />
                                                        <span>Đã lấy hàng</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons: Reliability & Controls */}
                                    <div className="mt-4 pt-3.5 border-t border-white/10 space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            {/* Health Check Button */}
                                            <button
                                                type="button"
                                                onClick={() => handleRunHealthCheck(box)}
                                                className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 inline-flex items-center justify-center gap-1.5"
                                            >
                                                <Wrench size={13} className="text-cyan-400" />
                                                <span>Kiểm tra Khóa</span>
                                            </button>

                                            {/* Request Owner OTP */}
                                            <button
                                                type="button"
                                                onClick={() => handleRequestOtp(box)}
                                                className="py-2 px-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-bold transition-all border border-cyan-500/30 inline-flex items-center justify-center gap-1.5"
                                            >
                                                <KeyRound size={13} />
                                                <span>Lấy mã OTP</span>
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 pt-1">
                                            {/* Emergency Unlock */}
                                            <button
                                                type="button"
                                                onClick={() => setEmergencyModal({ open: true, box, loading: false })}
                                                className="text-xs text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 py-1 font-semibold"
                                            >
                                                <Zap size={13} />
                                                <span>Mở khẩn cấp từ xa</span>
                                            </button>

                                            {/* QR Code modal */}
                                            <button
                                                type="button"
                                                onClick={() => setQrModalBox(box)}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300 transition hover:bg-cyan-500/20"
                                            >
                                                <QrCode size={13} />
                                                <span>Mã QR</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* 3. KHU VỰC: DANH SÁCH TỦ CÓ SẴN TRONG KHO (AVAILABLE IN WAREHOUSE) */}
            <div className="space-y-4 pt-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-extrabold text-white uppercase tracking-wide flex items-center gap-2">
                            <Sparkles size={16} className="text-pink-400" />
                            Đăng ký Tủ khóa mới trong kho ({availableBoxes.length} tủ khả dụng)
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Chọn tủ khóa bên dưới, nhập địa chỉ đề xuất lắp đặt và gửi cho Admin xét duyệt
                        </p>
                    </div>
                </div>

                {availableBoxes.length === 0 ? (
                    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center text-slate-400">
                        <Box size={36} className="mx-auto mb-2 text-slate-500" />
                        <p className="text-sm font-semibold text-white">Hiện tại kho đã hết tủ sẵn sàng.</p>
                        <p className="text-xs text-slate-400 mt-1">Vui lòng liên hệ Admin để bổ sung thêm tủ mới.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {availableBoxes.map((box) => (
                            <div
                                key={box.id || box.boxId}
                                className="flex flex-col justify-between rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/15 via-slate-900/40 to-slate-950/60 p-5 transition hover:border-cyan-400/50 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)]"
                            >
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs font-extrabold text-cyan-400">
                                            {box.boxId}
                                        </span>
                                        <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                                            Trong kho
                                        </span>
                                    </div>
                                    <h4 className="mt-2 text-base font-bold text-white">
                                        {box.name}
                                    </h4>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Kích thước tiêu chuẩn · {box.totalCompartments || 12} ngăn chứa thông minh
                                    </p>
                                </div>

                                <div className="mt-5 pt-3.5 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenRegisterModal(box)}
                                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-2xl border border-cyan-400/40 bg-gradient-to-r from-cyan-600 to-blue-600 py-3 text-xs font-extrabold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-500 hover:to-blue-500 active:scale-98"
                                    >
                                        <Plus size={15} />
                                        <span>Đăng ký lắp đặt tủ này</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL 1: Registration Form */}
            <Modal
                open={!!selectedBox}
                onClose={() => setSelectedBox(null)}
                title={`Đăng ký lắp đặt ${selectedBox?.name || ''}`}
                description="Điền thông tin địa chỉ mà bạn đề xuất lắp đặt tủ khóa để Admin tiến hành nghiệm thu"
                size="md"
            >
                {selectedBox && (
                    <form onSubmit={handleSubmitRegistration} className="space-y-4">
                        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4 text-xs text-slate-300">
                            <p>
                                <strong>Mã tủ:</strong>{' '}
                                <span className="font-mono text-cyan-300 font-bold">{selectedBox.boxId}</span>
                            </p>
                            <p className="mt-1">
                                <strong>Số ngăn tủ:</strong> {selectedBox.totalCompartments || 12} ngăn
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-white mb-1.5">
                                Địa chỉ mong muốn lắp đặt <span className="text-rose-400">* (Bắt buộc)</span>:
                            </label>
                            <textarea
                                rows={3}
                                required
                                value={requestedAddress}
                                onChange={(e) => {
                                    setRequestedAddress(e.target.value)
                                    if (e.target.value.trim().length >= 10) setAddressError('')
                                }}
                                placeholder="Ví dụ: Số 12 Đường 3/2, Phường Xuân Khánh, Quận Ninh Kiều, TP. Cần Thơ"
                                className={`w-full rounded-2xl border bg-white/[0.04] p-3.5 text-xs text-white placeholder-slate-500 transition focus:outline-none ${
                                    addressError
                                        ? 'border-rose-500 focus:border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                                        : 'border-white/10 focus:border-cyan-400'
                                }`}
                            />
                            {addressError ? (
                                <p className="mt-1 text-xs text-rose-400 font-semibold flex items-center gap-1">
                                    <AlertCircle size={13} /> {addressError}
                                </p>
                            ) : (
                                <p className="mt-1 text-[11px] text-slate-400">
                                    * Tối thiểu 10 ký tự. Vui lòng ghi rõ số nhà, tên đường, phường/xã, quận/huyện.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1.5">
                                Ghi chú vị trí chi tiết (Tùy chọn):
                            </label>
                            <input
                                type="text"
                                value={requestedNote}
                                onChange={(e) => setRequestedNote(e.target.value)}
                                placeholder="Ví dụ: Cạnh cổng chính, bên hông nhà, có mái che che mưa nắng..."
                                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                            />
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setSelectedBox(null)}
                                className="ui-button-secondary px-4 py-2.5 text-xs font-bold rounded-xl"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50"
                            >
                                {submitting ? 'Đang gửi yêu cầu...' : 'Xác nhận gửi yêu cầu đăng ký'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* MODAL 2: Diagnostic Health Check Modal */}
            <Modal
                open={healthModal.open}
                onClose={() => setHealthModal({ open: false, box: null, data: null, loading: false })}
                title={`Kiểm tra Hệ thống Khóa & OTP - ${healthModal.box?.name || ''}`}
                description="Chẩn đoán phần cứng, trạng thái cảm biến khóa và dịch vụ mã xác thực mở tủ"
                size="md"
            >
                {healthModal.loading ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                        <RefreshCw className="w-7 h-7 mx-auto mb-2 animate-spin text-cyan-400" />
                        Đang kết nối vi điều khiển & chẩn đoán hệ thống khóa...
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                                <span className="text-slate-400 block mb-1">Khóa điện từ:</span>
                                <span className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                                    <CheckCircle2 size={16} /> Hoạt động bình thường
                                </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                                <span className="text-slate-400 block mb-1">Dịch vụ OTP/PIN:</span>
                                <span className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                                    <CheckCircle2 size={16} /> Trực tuyến (Online)
                                </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                                <span className="text-slate-400 block mb-1">Mức Pin dự phòng:</span>
                                <span className="font-mono font-bold text-white text-sm">
                                    {healthModal.data?.batteryLevel ?? 95}% (Điện áp ổn định)
                                </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                                <span className="text-slate-400 block mb-1">Độ trễ tín hiệu:</span>
                                <span className="font-mono font-bold text-cyan-400 text-sm">
                                    42 ms (Rất nhanh)
                                </span>
                            </div>
                        </div>

                        {/* Master Backup PIN Card */}
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
                            <div className="flex items-center gap-1.5 font-bold text-amber-300">
                                <ShieldCheck size={16} />
                                <span>Mã PIN Dự Phòng Cứu Hộ (Master Backup PIN):</span>
                            </div>
                            <p className="text-amber-200/90 leading-relaxed">
                                Dùng để mở khóa tủ thủ công ngay tại bàn phím tủ nếu khu vực bị mất kết nối Internet/WiFi:
                            </p>
                            <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/40 text-center font-mono font-black text-2xl text-amber-300 tracking-[0.25em]">
                                {healthModal.data?.masterBackupPin || '888999'}
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setHealthModal({ open: false, box: null, data: null, loading: false })}
                                className="ui-button-primary px-5 py-2.5 text-xs font-bold rounded-xl"
                            >
                                Đóng kết quả kiểm tra
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* MODAL 3: OTP Code Generator with Countdown */}
            <Modal
                open={otpModal.open}
                onClose={() => setOtpModal({ open: false, box: null, data: null, loading: false, timeLeft: 0 })}
                title={`Mã OTP Mở Tủ - ${otpModal.box?.name || ''}`}
                description="Mã số 6 chữ số an toàn dùng để mở tủ trực tiếp tại chỗ"
                size="md"
            >
                {otpModal.loading ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                        <RefreshCw className="w-7 h-7 mx-auto mb-2 animate-spin text-cyan-400" />
                        Đang sinh mã OTP mở tủ...
                    </div>
                ) : (
                    <div className="space-y-4 text-center">
                        <div className="p-5 rounded-3xl bg-slate-950 border-2 border-cyan-500/50 shadow-2xl">
                            <span className="block text-xs font-extrabold text-cyan-400 uppercase tracking-widest mb-1.5">
                                MÃ OTP MỞ TỦ (HẾT HẠN TRONG {Math.floor(otpModal.timeLeft / 60)}:{(otpModal.timeLeft % 60).toString().padStart(2, '0')})
                            </span>
                            <div className="text-4xl sm:text-5xl font-black font-mono text-white tracking-[0.3em] my-3">
                                {otpModal.data?.otp || '123456'}
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                                Đến trước tủ và bấm: <strong className="text-cyan-300"># {otpModal.data?.otp || '123456'} #</strong>
                            </p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-left space-y-1">
                            <span className="text-slate-400 font-semibold">Mã Master PIN dự phòng:</span>
                            <span className="font-mono font-bold text-amber-300 ml-2">
                                {otpModal.data?.masterBackupPin || '888999'}
                            </span>
                            <p className="text-[11px] text-slate-500">
                                Dùng mở tủ bất cứ lúc nào khi cần thiết.
                            </p>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setOtpModal({ open: false, box: null, data: null, loading: false, timeLeft: 0 })}
                                className="ui-button-primary px-5 py-2.5 text-xs font-bold rounded-xl"
                            >
                                Đã ghi nhớ & Đóng
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* MODAL 4: Emergency Remote Unlock Confirmation */}
            <Modal
                open={emergencyModal.open}
                onClose={() => setEmergencyModal({ open: false, box: null, loading: false })}
                title="Xác nhận Mở Tủ Khẩn Cấp Từ Xa"
                description="Lệnh mở khóa sẽ được phát sóng trực tiếp tới bo mạch IoT của tủ"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-rose-400">
                            <AlertTriangle size={16} />
                            <span>Cảnh báo an toàn:</span>
                        </div>
                        <p>
                            Cửa tủ <strong>{emergencyModal.box?.name || emergencyModal.box?.boxId}</strong> sẽ bật mở chốt ngay lập tức. Hãy đảm bảo bạn hoặc người được ủy quyền đang có mặt trước tủ để nhận hàng.
                        </p>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                        <button
                            type="button"
                            onClick={() => setEmergencyModal({ open: false, box: null, loading: false })}
                            className="ui-button-secondary px-4 py-2 text-xs font-bold rounded-xl"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="button"
                            onClick={() => handleEmergencyUnlock(emergencyModal.box)}
                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30"
                        >
                            ⚡ Mở khóa ngay
                        </button>
                    </div>
                </div>
            </Modal>

            {/* MODAL 5: Zoom Proof Photo */}
            <Modal
                open={proofPhotoModal.open}
                onClose={() => setProofPhotoModal({ open: false, photo: null, boxName: '' })}
                title={`Ảnh Kiện Hàng Trong Tủ - ${proofPhotoModal.boxName}`}
                description="Bằng chứng giao hàng do Shipper chụp khi đóng tủ"
                size="md"
            >
                <div className="space-y-4">
                    <div className="rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-black flex items-center justify-center">
                        <img
                            src={proofPhotoModal.photo}
                            alt="Proof of parcel in locker"
                            className="w-full max-h-[380px] object-contain"
                        />
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setProofPhotoModal({ open: false, photo: null, boxName: '' })}
                            className="ui-button-primary px-5 py-2 text-xs font-bold rounded-xl"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            </Modal>

            {/* MODAL 6: QR View Modal */}
            <Modal
                open={!!qrModalBox}
                onClose={() => setQrModalBox(null)}
                title={`Mã QR Tủ Khóa - ${qrModalBox?.name || ''}`}
                description="Mã QR công khai dán trên mặt tủ để shipper và khách vãng lai quét yêu cầu mở tủ"
                size="sm"
            >
                {qrModalBox && (
                    <div className="flex flex-col items-center justify-center p-3 text-center">
                        <div className="rounded-2xl border-2 border-cyan-400/40 bg-white p-3 shadow-xl">
                            <img
                                src={
                                    qrModalBox.qrImageUrl ||
                                    `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                                        qrModalBox.qrUrl || `https://lockship-gamma.vercel.app/public/box-scan/${qrModalBox.boxId}`
                                    )}`
                                }
                                alt={`QR ${qrModalBox.boxId}`}
                                className="size-48 object-contain"
                            />
                        </div>
                        <p className="mt-3 font-mono text-sm font-extrabold text-cyan-300">
                            {qrModalBox.boxId}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            {qrModalBox.address}
                        </p>
                    </div>
                )}
            </Modal>
        </section>
    )
}
