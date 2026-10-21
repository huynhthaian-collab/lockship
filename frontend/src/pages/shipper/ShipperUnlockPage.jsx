import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
    KeyRound,
    Lock,
    Unlock,
    ShieldCheck,
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Cpu,
    BatteryMedium
} from 'lucide-react'
import ErrorMessage from '../../components/ErrorMessage.jsx'
import Loading from '../../components/Loading.jsx'
import { OwnerNotice } from '../../components/OwnerFeedback.jsx'
import ShipperPage from '../../components/ShipperPage.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import Card from '../../components/ui/Card.jsx'
import SpatialTiltCard from '../../components/spatial/SpatialTiltCard.jsx'
import IsometricLocker from '../../components/spatial/IsometricLocker.jsx'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import { shipperDeliveryApi } from '../../services/ownerApi.js'

export default function ShipperUnlockPage() {
    const { id } = useParams()
    const [delivery, setDelivery] = useState(null)
    const [code, setCode] = useState('')
    const [codeExpiresAt, setCodeExpiresAt] = useState(null)
    const [codeError, setCodeError] = useState('')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [saving, setSaving] = useState(false)
    const submittingRef = useRef(false)

    const refresh = useCallback(async () => {
        setError('')
        try {
            const currentDelivery = await shipperDeliveryApi.get(id)
            setDelivery(currentDelivery)
            if (currentDelivery?.status === 'authorized' && currentDelivery.unlockStatus !== 'succeeded') {
                try {
                    const activeCode = await shipperDeliveryApi.unlockCode(id)
                    if (activeCode?.code) {
                        setCode(activeCode.code)
                        setCodeExpiresAt(activeCode.expiresAt)
                        setCodeError('')
                    }
                } catch (requestError) {
                    setCode('')
                    setCodeExpiresAt(null)
                    setCodeError(requestError.message || 'Chưa thể lấy mã mở khóa.')
                }
            } else {
                setCode('')
                setCodeExpiresAt(null)
                setCodeError('')
            }
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải thông tin đơn hàng.')
        }
    }, [id])

    useEffect(() => {
        let active = true
        async function fetchInitial() {
            try {
                const currentDelivery = await shipperDeliveryApi.get(id)
                if (!active) return
                setDelivery(currentDelivery)
                if (currentDelivery?.status === 'authorized' && currentDelivery.unlockStatus !== 'succeeded') {
                    try {
                        const activeCode = await shipperDeliveryApi.unlockCode(id)
                        if (active && activeCode?.code) {
                            setCode(activeCode.code)
                            setCodeExpiresAt(activeCode.expiresAt)
                            setCodeError('')
                        }
                    } catch (requestError) {
                        if (active) {
                            setCode('')
                            setCodeExpiresAt(null)
                            setCodeError(requestError.message || 'Chưa thể lấy mã mở khóa.')
                        }
                    }
                }
            } catch (requestError) {
                if (active) setError(requestError.message || 'Không thể tải thông tin đơn hàng.')
            }
        }
        fetchInitial()
        return () => {
            active = false
        }
    }, [id])

    const onCodeIssued = useCallback((event) => {
        if (event?.deliveryId === id) refresh()
    }, [id, refresh])

    const onUnlockSuccess = useCallback((event) => {
        if (event?.deliveryId !== id) return
        setDelivery((current) => (current ? { ...current, unlockStatus: 'succeeded' } : current))
        setNotice('Thiết bị IoT đã mở khóa thành công. Bạn có thể mở thùng và bàn giao hàng.')
    }, [id])

    const onUnlockFailure = useCallback((event) => {
        if (event?.deliveryId !== id) return
        setDelivery((current) => (current ? { ...current, unlockStatus: 'failed' } : current))
        setError(
            event.errorCode
                ? `Thiết bị không thể mở khóa (${event.errorCode}). Hãy liên hệ chủ sở hữu đội xe.`
                : 'Thiết bị không thể mở khóa. Hãy kiểm tra lại kết nối của xe.'
        )
    }, [id])

    useSocketEvent('unlock:success', onUnlockSuccess)
    useSocketEvent('unlock:failed', onUnlockFailure)
    useSocketEvent('unlock-code:created', onCodeIssued)

    async function submit(event) {
        event.preventDefault()
        if (submittingRef.current) return

        setError('')
        setNotice('')
        const trimmedCode = code.trim()
        if (!/^\d{6}$/.test(trimmedCode)) {
            setError('Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.')
            return
        }

        submittingRef.current = true
        setSaving(true)
        try {
            const result = await shipperDeliveryApi.unlock(id, trimmedCode)
            setCode('')
            setCodeExpiresAt(null)
            setCodeError('')
            setDelivery((current) => (current ? { ...current, unlockStatus: 'pending' } : current))
            setNotice(
                `Mã đã được máy chủ xác nhận. Đang gửi xung điện tử mở khóa đến IoT${
                    result?.requestId ? ` (${result.requestId.slice(0, 8)})` : ''
                }...`
            )
        } catch (requestError) {
            setError(
                requestError.code
                    ? `${requestError.message} (${requestError.code})`
                    : requestError.message || 'Không thể xác minh mã mở khóa.'
            )
        } finally {
            submittingRef.current = false
            setSaving(false)
        }
    }

    if (!delivery && !error) return <Loading label="Đang kiểm tra kết nối chốt khóa IoT..." />

    const isUnlocked = delivery?.unlockStatus === 'succeeded'
    const deviceId = delivery?.iotDeviceId || delivery?.vehicleId?.iotDeviceId || 'LOCK-ESP32-01'

    return (
        <ShipperPage
            eyebrow="Bàn giao an toàn"
            title="Mở khóa thùng hàng IoT 3D"
            description="Xác thực quyền mở khóa thông qua mã OTP bảo mật do chủ đội xe cung cấp."
        >
            <Link
                className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
                to={`/shipper/deliveries/${id}`}
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Chi tiết đơn giao hàng #{id?.slice(-6).toUpperCase()}
            </Link>

            {error && <ErrorMessage message={error} />}
            {notice && <OwnerNotice>{notice}</OwnerNotice>}

            {delivery && (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
                    {/* Left: Input Form and Status */}
                    <div className="space-y-5">
                        <Card className="p-5 border-white/10 bg-slate-900/40">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Địa chỉ giao hàng</p>
                            <p className="mt-1.5 break-words text-base font-bold text-white">
                                {delivery.deliveryAddress}
                            </p>
                            <div className="mt-4 flex flex-wrap items-center gap-3 pt-3 border-t border-white/10">
                                <span className="text-xs font-semibold text-slate-400">Trạng thái khóa:</span>
                                <StatusPill value={delivery.unlockStatus || 'pending'} />
                                <span className="text-xs font-mono text-cyan-400 font-semibold flex items-center gap-1">
                                    <Cpu className="h-3 w-3" />
                                    {deviceId}
                                </span>
                            </div>
                        </Card>

                        {delivery.status !== 'authorized' ? (
                            <ErrorMessage
                                title="Đơn hàng chưa được cấp quyền"
                                message="Chủ đội xe cần xác nhận cấp quyền mở khóa (Authorized) cho đơn hàng này trước khi bạn có thể nhập mã."
                            />
                        ) : isUnlocked ? (
                            <Card className="p-6 border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                        <Unlock className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Thùng Hàng Đã Mở Khóa Thành Công!</h3>
                                        <p className="text-xs text-emerald-300 mt-0.5">Chốt cơ điện tử đã được rút về vị trí an toàn</p>
                                    </div>
                                </div>
                                <p className="mt-4 text-xs text-slate-300 leading-relaxed">
                                    Bạn có thể mở cửa thùng xe, giao gói hàng cho khách và bấm nút bên dưới để hoàn tất đơn hàng.
                                </p>
                                <div className="mt-5">
                                    <Link
                                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-950/40 transition"
                                        to={`/shipper/deliveries/${id}`}
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        Quay lại hoàn tất đơn hàng
                                    </Link>
                                </div>
                            </Card>
                        ) : (
                            <Card className="p-6 border-white/10 bg-slate-900/60 shadow-2xl">
                                <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
                                    <KeyRound className="h-5 w-5 text-cyan-400" />
                                    <div>
                                        <h3 className="text-base font-bold text-white">Nhập mã OTP mở khóa</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">Mã bảo mật gồm 6 chữ số được cấp quyền từ hệ thống</p>
                                    </div>
                                </div>

                                {codeExpiresAt && (
                                    <div className="mt-4">
                                        <OwnerNotice>
                                            Mã có hiệu lực đến {new Date(codeExpiresAt).toLocaleTimeString('vi-VN')}.
                                        </OwnerNotice>
                                    </div>
                                )}
                                {codeError && (
                                    <div className="mt-4">
                                        <ErrorMessage
                                            title="Chưa có mã mở khóa"
                                            message={`${codeError} Hãy liên hệ chủ xe để được cấp mã mới.`}
                                        />
                                    </div>
                                )}

                                <form className="space-y-5 mt-5" onSubmit={submit}>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                                            Mã số xác thực (OTP 6 số)
                                        </label>
                                        <input
                                            autoComplete="one-time-code"
                                            className="w-full max-w-xs rounded-2xl border border-cyan-500/50 bg-slate-950 px-4 py-3 text-center font-mono text-3xl font-black tracking-[0.35em] text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.2)] focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                            disabled={saving}
                                            inputMode="numeric"
                                            maxLength={6}
                                            minLength={6}
                                            onChange={(event) =>
                                                setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                                            }
                                            pattern="[0-9]{6}"
                                            placeholder="••••••"
                                            required
                                            value={code}
                                        />
                                    </div>
                                    <p className="text-xs leading-relaxed text-slate-400">
                                        Mã mở khóa được mã hóa bảo mật từ phía máy chủ và truyền an toàn qua MQTT tới thiết bị IoT.
                                    </p>
                                    <div className="pt-2">
                                        {saving ? (
                                            <Loading label="Đang truyền tín hiệu mở khóa tới IoT..." />
                                        ) : (
                                            <button
                                                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/40 transition disabled:opacity-50"
                                                disabled={saving || code.length !== 6}
                                                type="submit"
                                            >
                                                <Unlock className="h-4 w-4" />
                                                Xác minh và Mở khóa thùng hàng
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </Card>
                        )}
                    </div>

                    {/* Right: 3D Isometric Locker Visualization */}
                    <SpatialTiltCard className="h-fit rounded-2xl" maxTilt={6}>
                        <Card className="p-6 border-white/10 bg-slate-900/60 shadow-2xl">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Mô phỏng Khóa IoT 3D
                                </h3>
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                                    LIVE
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mb-4">
                                Trạng thái chốt khóa điện tử thời gian thực từ cảm biến ESP32
                            </p>
                            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#111728] to-[#0a0e1a] p-3 shadow-inner">
                                <IsometricLocker
                                    battery={94}
                                    deviceId={deviceId}
                                    isOnline={true}
                                    lockStatus={delivery.unlockStatus === 'succeeded' ? 'unlocked' : 'locked'}
                                />
                            </div>
                        </Card>
                    </SpatialTiltCard>
                </div>
            )}
        </ShipperPage>
    )
}