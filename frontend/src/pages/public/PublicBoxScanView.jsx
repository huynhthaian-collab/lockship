import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
    Box,
    QrCode,
    Phone,
    User,
    Truck,
    Package,
    Clock,
    CheckCircle2,
    XCircle,
    Copy,
    Check,
    AlertCircle,
    ArrowRight,
    RefreshCw,
    ShieldCheck,
    Lock,
    Unlock,
    KeyRound,
    Sparkles,
    Camera,
    Image as ImageIcon,
    Trash2,
    CheckCheck,
    HelpCircle,
    PackageCheck,
} from 'lucide-react'
import { publicBoxApi } from '../../services/ownerApi.js'
import { createGuestSocket } from '../../services/socketClient.js'
import DeliveryStatusStepper from '../../components/delivery/DeliveryStatusStepper.jsx'

const QUICK_SOURCES = [
    'Shopee',
    'TikTok Shop',
    'Lazada',
    'GHTK',
    'Viettel Post',
    'Giao Hàng Nhanh',
    'Cửa hàng ngoài',
]

// Canvas image compressor (< 300KB)
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                let width = img.width
                let height = img.height
                const maxDim = 800
                if (width > height && width > maxDim) {
                    height = Math.round((height * maxDim) / width)
                    width = maxDim
                } else if (height > maxDim) {
                    width = Math.round((width * maxDim) / height)
                    height = maxDim
                }
                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, width, height)
                resolve(canvas.toDataURL('image/jpeg', 0.72))
            }
            img.onerror = reject
            img.src = e.target.result
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

// Generate demo photo canvas (instant offline testing)
function createDemoProofImage(label = 'Shopee') {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 300
    const ctx = canvas.getContext('2d')

    // Locker interior
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, 400, 300)
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(20, 20, 360, 260)

    // Shelf base
    ctx.fillStyle = '#334155'
    ctx.fillRect(30, 220, 340, 50)

    // Parcel box
    ctx.fillStyle = '#b45309'
    ctx.fillRect(90, 90, 220, 140)

    // Sealing tape
    ctx.fillStyle = '#f59e0b'
    ctx.fillRect(185, 90, 30, 140)
    ctx.fillRect(90, 150, 220, 20)

    // Label on box
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(110, 105, 110, 45)
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 11px sans-serif'
    ctx.fillText('LOCKSHIP VERIFIED', 115, 122)
    ctx.font = '10px sans-serif'
    ctx.fillText(`Nguồn: ${label}`, 115, 138)

    // Watermark
    ctx.fillStyle = '#10b981'
    ctx.font = 'bold 12px monospace'
    ctx.fillText(`LOCKER COMPARTMENT OK`, 110, 255)

    return canvas.toDataURL('image/jpeg', 0.8)
}

export default function PublicBoxScanView() {
    const { boxId } = useParams()
    const [boxInfo, setBoxInfo] = useState(null)
    const [loadingInfo, setLoadingInfo] = useState(true)

    // Form State
    const [form, setForm] = useState({
        shipperName: '',
        shipperPhone: '',
        deliverySource: 'Shopee',
        packageDescription: '',
    })
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    // Flow State: 'FORM' | 'WAITING' | 'APPROVED' | 'UNLOCKED' | 'PARCEL_IN_LOCKER' | 'REJECTED'
    const [status, setStatus] = useState('FORM')
    const [requestData, setRequestData] = useState(null)
    const [guestToken, setGuestToken] = useState(null)
    const [approvalData, setApprovalData] = useState(null)
    const [copied, setCopied] = useState(false)

    // Keypad state
    const [keypadInput, setKeypadInput] = useState('')
    const [keypadFeedback, setKeypadFeedback] = useState('')

    // Proof photo state
    const [proofImage, setProofImage] = useState(null)
    const [confirmingPutInBox, setConfirmingPutInBox] = useState(false)
    const [deliveryCompletedData, setDeliveryCompletedData] = useState(null)

    const fileInputRef = useRef(null)
    const socketRef = useRef(null)
    const pollTimerRef = useRef(null)

    // 1. Fetch Box Info on mount
    useEffect(() => {
        let isMounted = true
        async function fetchBox() {
            setLoadingInfo(true)
            try {
                const info = await publicBoxApi.getInfo(boxId)
                if (isMounted) setBoxInfo(info)
            } catch (err) {
                console.warn('Could not fetch box info:', err)
                if (isMounted) {
                    setBoxInfo({
                        boxId: boxId || 'box-unknown',
                        name: `Tủ Lockship #${boxId?.toUpperCase()}`,
                        address: 'Vị trí trạm tủ thông minh Lockship 24/7',
                    })
                }
            } finally {
                if (isMounted) setLoadingInfo(false)
            }
        }
        if (boxId) fetchBox()
        return () => {
            isMounted = false
        }
    }, [boxId])

    // 2. Real-time Socket & Polling for updates
    useEffect(() => {
        if (!guestToken || !requestData) return
        const requestId = requestData._id || requestData.id

        const socket = createGuestSocket(guestToken)
        socketRef.current = socket

        socket.on('connect', () => {
            console.log('Guest socket connected to room:', `request_${requestId}`)
        })

        socket.on('request_approved', (payload) => {
            console.log('Received request_approved event:', payload)
            setApprovalData(payload)
            setStatus((prev) => (prev === 'PARCEL_IN_LOCKER' ? prev : 'APPROVED'))
        })

        socket.on('request_rejected', (payload) => {
            console.log('Received request_rejected event:', payload)
            setRequestData((prev) => ({ ...prev, ...payload }))
            setStatus('REJECTED')
        })

        socket.on('box_unlocked_for_delivery', () => {
            setStatus((prev) => (prev === 'PARCEL_IN_LOCKER' ? prev : 'UNLOCKED'))
        })

        socket.on('box_parcel_delivered', (payload) => {
            setDeliveryCompletedData(payload)
            setStatus('PARCEL_IN_LOCKER')
        })

        // Backup polling
        pollTimerRef.current = setInterval(async () => {
            try {
                const updated = await publicBoxApi.getStatus(boxId, requestId)
                if (updated?.status === 'APPROVED' && status === 'WAITING') {
                    setApprovalData({
                        unlockCode: updated.unlockCode,
                        orderInfo: updated.order,
                        message: 'Yêu cầu mở tủ đã được Chủ tủ phê duyệt!',
                    })
                    setStatus('APPROVED')
                } else if (updated?.status === 'UNLOCKED_FOR_DELIVERY' && status === 'APPROVED') {
                    setStatus('UNLOCKED')
                } else if (updated?.status === 'PARCEL_IN_LOCKER') {
                    setStatus('PARCEL_IN_LOCKER')
                } else if (updated?.status === 'REJECTED') {
                    setRequestData((prev) => ({ ...prev, ...updated }))
                    setStatus('REJECTED')
                }
            } catch {
                // Ignore poll error
            }
        }, 3500)

        return () => {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current)
            if (socketRef.current) {
                socketRef.current.disconnect()
                socketRef.current = null
            }
        }
    }, [status, guestToken, requestData, boxId])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!form.shipperPhone || form.shipperPhone.trim().length < 8) {
            setError('Vui lòng nhập số điện thoại hợp lệ (tối thiểu 8 chữ số).')
            return
        }

        setSubmitting(true)
        try {
            const res = await publicBoxApi.requestAccess(boxId, {
                shipperName: form.shipperName.trim() || 'Shipper vãng lai',
                shipperPhone: form.shipperPhone.trim(),
                deliverySource: form.deliverySource.trim(),
                packageDescription: form.packageDescription.trim(),
            })
            setRequestData(res.request)
            setGuestToken(res.guestToken)
            setStatus('WAITING')
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.')
        } finally {
            setSubmitting(false)
        }
    }

    const copyPinCode = () => {
        const code = approvalData?.unlockCode
        if (!code) return
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
    }

    // Keypad actions
    const handleKeypadPress = (val) => {
        setKeypadFeedback('')
        if (keypadInput.length < 8) {
            setKeypadInput((prev) => prev + val)
        }
    }

    const handleKeypadBackspace = () => {
        setKeypadFeedback('')
        setKeypadInput((prev) => prev.slice(0, -1))
    }

    const handleKeypadClear = () => {
        setKeypadFeedback('')
        setKeypadInput('')
    }

    // Shipper enters PIN or simulates unlock
    const handleVerifyKeypadUnlock = async () => {
        const expectedPin = approvalData?.unlockCode
        const requestId = requestData?._id || requestData?.id

        if (keypadInput && expectedPin && keypadInput !== expectedPin) {
            setKeypadFeedback('❌ Mã PIN không khớp! Vui lòng kiểm tra lại.')
            return
        }

        try {
            setKeypadFeedback('🔓 Đang mở chốt khóa tủ...')
            await publicBoxApi.notifyUnlocked(requestId, { boxId })
            setStatus('UNLOCKED')
            setKeypadFeedback('✅ Cửa tủ đã mở! Hãy bỏ hàng vào ngăn tủ.')
        } catch (err) {
            console.warn('notifyUnlocked error:', err)
            setStatus('UNLOCKED')
        }
    }

    // Handle photo file selection
    const handlePhotoSelect = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const compressed = await compressImage(file)
            setProofImage(compressed)
        } catch (err) {
            console.error('Error compressing image:', err)
            alert('Không thể nén ảnh chụp. Vui lòng thử lại.')
        }
    }

    // Handle demo quick photo
    const handleQuickDemoPhoto = (label) => {
        const demo = createDemoProofImage(label)
        setProofImage(demo)
    }

    // Submit Put in Box Confirmation
    const handleConfirmPutInBox = async () => {
        const requestId = requestData?._id || requestData?.id
        setConfirmingPutInBox(true)
        setError('')
        try {
            const res = await publicBoxApi.confirmPutInBox(requestId, {
                boxId,
                deliveryProofImage: proofImage || createDemoProofImage(form.deliverySource || 'Giao Hàng'),
                notes: 'Kiện hàng đã bỏ vào tủ và khóa an toàn.',
            })
            setDeliveryCompletedData(res)
            setStatus('PARCEL_IN_LOCKER')
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Lỗi xác nhận gửi hàng vào tủ.')
        } finally {
            setConfirmingPutInBox(false)
        }
    }

    const resetToForm = () => {
        setStatus('FORM')
        setRequestData(null)
        setGuestToken(null)
        setApprovalData(null)
        setKeypadInput('')
        setProofImage(null)
        setDeliveryCompletedData(null)
        setError('')
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-white">
            {/* Top Navigation Bar */}
            <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 py-3.5 sm:px-6">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 text-white font-black text-lg">
                            <Box className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 text-lg tracking-tight">
                                LOCKSHIP
                            </span>
                            <span className="block text-[11px] text-slate-400 font-medium">
                                Smart Locker Access Point
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Box Scan</span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
                {/* Locker Information Header Card */}
                <div className="mb-6 rounded-3xl bg-slate-900/90 border border-slate-800/80 p-5 shadow-xl backdrop-blur-md">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-blue-500/20 text-cyan-300 border border-blue-500/30 uppercase tracking-wide">
                                    Mã Tủ: {boxId?.toUpperCase()}
                                </span>
                                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    Online · Khóa Sẵn Sàng
                                </span>
                            </div>
                            <h1 className="text-lg font-extrabold text-white leading-snug">
                                {boxInfo?.name || `Trạm tủ thông minh Lockship #${boxId?.toUpperCase()}`}
                            </h1>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                {boxInfo?.address || 'Khu vực giao nhận thông minh Lockship 24/7'}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
                            <Lock className="w-6 h-6 text-cyan-400" />
                        </div>
                    </div>

                    {/* Stepper displayed when in an active delivery process */}
                    {['APPROVED', 'UNLOCKED', 'PARCEL_IN_LOCKER'].includes(status) && (
                        <div className="mt-5 pt-4 border-t border-slate-800/80">
                            <DeliveryStatusStepper
                                currentStatus={
                                    status === 'PARCEL_IN_LOCKER'
                                        ? 'PARCEL_IN_LOCKER'
                                        : status === 'UNLOCKED'
                                        ? 'UNLOCKED_FOR_DELIVERY'
                                        : 'APPROVED'
                                }
                            />
                        </div>
                    )}
                </div>

                {/* 3-STEP VISUAL ONBOARDING GUIDE (Show for new visitors) */}
                {status === 'FORM' && (
                    <div className="mb-6 rounded-3xl bg-gradient-to-br from-slate-900/90 to-cyan-950/20 border border-cyan-500/20 p-5 shadow-lg">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                            <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                                Quy trình 3 bước gửi hàng nhanh (Không cần tài khoản)
                            </h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5 text-center">
                            <div className="rounded-2xl bg-slate-950/60 border border-slate-800/80 p-3 flex flex-col items-center">
                                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-extrabold flex items-center justify-center mb-1.5 border border-cyan-500/30">
                                    1
                                </span>
                                <p className="text-[11px] font-bold text-white">Nhập SĐT</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Gửi yêu cầu mở tủ</p>
                            </div>
                            <div className="rounded-2xl bg-slate-950/60 border border-slate-800/80 p-3 flex flex-col items-center">
                                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-extrabold flex items-center justify-center mb-1.5 border border-amber-500/30">
                                    2
                                </span>
                                <p className="text-[11px] font-bold text-white">Nhận mã PIN</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Bấm mã mở hộc</p>
                            </div>
                            <div className="rounded-2xl bg-slate-950/60 border border-slate-800/80 p-3 flex flex-col items-center">
                                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-extrabold flex items-center justify-center mb-1.5 border border-emerald-500/30">
                                    3
                                </span>
                                <p className="text-[11px] font-bold text-white">Bỏ hàng & Khóa</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Chụp ảnh xác nhận</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW 1: Input Form */}
                {status === 'FORM' && (
                    <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                        <div className="mb-5">
                            <h2 className="text-xl font-extrabold text-white">Gửi yêu cầu mở tủ khóa</h2>
                            <p className="text-xs text-slate-400 mt-1">
                                Điền số điện thoại và nguồn hàng để gửi thông báo tức thì đến Chủ sở hữu tủ khóa.
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Shipper Phone */}
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                                    Số điện thoại Shipper <span className="text-rose-400">*</span>
                                </label>
                                <div className="relative">
                                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="tel"
                                        required
                                        placeholder="Ví dụ: 0912 345 678"
                                        value={form.shipperPhone}
                                        onChange={(e) => setForm({ ...form, shipperPhone: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            {/* Shipper Name */}
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                                    Họ tên người giao (Tùy chọn)
                                </label>
                                <div className="relative">
                                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Ví dụ: Nguyễn Văn A"
                                        value={form.shipperName}
                                        onChange={(e) => setForm({ ...form, shipperName: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            {/* Delivery Source */}
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                                    Đơn hàng được giao từ đâu?
                                </label>
                                <div className="flex flex-wrap gap-1.5 mb-2.5">
                                    {QUICK_SOURCES.map((src) => (
                                        <button
                                            key={src}
                                            type="button"
                                            onClick={() => setForm({ ...form, deliverySource: src })}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                form.deliverySource === src
                                                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                            }`}
                                        >
                                            {src}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative">
                                    <Truck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Hoặc nhập tên sàn/cửa hàng khác"
                                        value={form.deliverySource}
                                        onChange={(e) => setForm({ ...form, deliverySource: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Package Note */}
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                                    Ghi chú kiện hàng (Tùy chọn)
                                </label>
                                <div className="relative">
                                    <Package className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                                    <textarea
                                        rows={2}
                                        placeholder="Ví dụ: Hộp vuông nhỏ, hàng dễ vỡ..."
                                        value={form.packageDescription}
                                        onChange={(e) => setForm({ ...form, packageDescription: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                                    />
                                </div>
                            </div>

                            {/* Large Mobile-first Action Button */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full min-h-[52px] mt-3 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                            >
                                {submitting ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        <span>Đang gửi thông báo đến Chủ tủ...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Gửi yêu cầu mở tủ cho Chủ sở hữu</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {/* VIEW 2: Waiting Screen */}
                {status === 'WAITING' && (
                    <div className="rounded-3xl bg-slate-900/90 border border-cyan-500/40 p-6 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
                        <div className="relative w-24 h-24 mx-auto my-3 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping opacity-60" />
                            <div className="absolute inset-2 rounded-full bg-cyan-500/30 animate-pulse" />
                            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/40 text-white">
                                <Clock className="w-8 h-8 animate-spin" style={{ animationDuration: '6s' }} />
                            </div>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold mb-2 border border-cyan-500/20">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            Đang kết nối Real-time với Chủ tủ
                        </div>

                        <h2 className="text-xl font-extrabold text-white mb-2">Đang chờ chủ tủ xác nhận...</h2>
                        <p className="text-xs text-slate-300 max-w-sm mx-auto mb-6 leading-relaxed">
                            Thông báo đã gửi đến điện thoại Chủ tủ. Màn hình sẽ <strong>tự động hiện mã mở tủ (PIN)</strong> ngay khi Chủ tủ phê duyệt.
                        </p>

                        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left text-xs space-y-2 mb-6">
                            <div className="flex justify-between items-center text-slate-400">
                                <span>Tủ nhận hàng:</span>
                                <span className="font-mono font-bold text-white">{boxId?.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400">
                                <span>SĐT Shipper:</span>
                                <span className="font-semibold text-cyan-400">{form.shipperPhone}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400">
                                <span>Đơn hàng từ:</span>
                                <span className="font-semibold text-amber-400">{form.deliverySource}</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={resetToForm}
                            className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-slate-800"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Hủy hoặc gửi lại thông tin khác
                        </button>
                    </div>
                )}

                {/* VIEW 3: Approved Screen with PIN & Large Keypad */}
                {(status === 'APPROVED' || status === 'UNLOCKED') && (
                    <div className="space-y-5">
                        <div className="rounded-3xl bg-slate-900/90 border border-emerald-500/40 p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-extrabold">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>CHỦ TỦ ĐÃ DUYỆT MỞ HỘC</span>
                                </div>
                                <span className="text-xs text-slate-400 font-mono">
                                    {approvalData?.orderInfo?.orderCode ? `Đơn: ${approvalData.orderInfo.orderCode}` : ''}
                                </span>
                            </div>

                            {/* GIANT PIN CODE CARD */}
                            <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/50 shadow-2xl text-center">
                                <span className="block text-xs font-extrabold text-emerald-400 uppercase tracking-widest mb-1">
                                    MÃ MỞ TỦ (PIN CODE)
                                </span>
                                <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-[0.25em] font-mono my-2.5 select-all text-center">
                                    {approvalData?.unlockCode || '888888'}
                                </div>

                                <div className="flex items-center justify-center gap-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={copyPinCode}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-all border border-emerald-500/30 active:scale-95"
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="w-4 h-4 text-emerald-400" />
                                                <span>Đã sao chép!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4" />
                                                <span>Sao chép mã PIN</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* VIRTUAL KEYPAD FOR ON-SCREEN SIMULATION / UNLOCK */}
                            <div className="mt-5 p-4 rounded-3xl bg-slate-950/70 border border-slate-800">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                        <KeyRound className="w-4 h-4 text-cyan-400" />
                                        Bàn phím tủ cảm ứng (Mô phỏng tại chỗ)
                                    </span>
                                    <span className="font-mono text-xs font-bold text-cyan-400">
                                        {keypadInput || '— — — — — —'}
                                    </span>
                                </div>

                                {/* Keypad Grid: 64px min buttons */}
                                <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                                        <button
                                            key={k}
                                            type="button"
                                            onClick={() => {
                                                if (k === 'C') handleKeypadClear()
                                                else if (k === '⌫') handleKeypadBackspace()
                                                else handleKeypadPress(k)
                                            }}
                                            className={`h-14 rounded-2xl flex items-center justify-center text-xl font-bold transition-all active:scale-95 shadow-md ${
                                                k === 'C'
                                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                                                    : k === '⌫'
                                                    ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                                                    : 'bg-slate-900 text-white border border-slate-800 hover:bg-slate-800/80 text-2xl'
                                            }`}
                                        >
                                            {k}
                                        </button>
                                    ))}
                                </div>

                                {keypadFeedback && (
                                    <p className="mt-3 text-xs text-center font-semibold text-emerald-400">
                                        {keypadFeedback}
                                    </p>
                                )}

                                <div className="mt-3.5 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleVerifyKeypadUnlock}
                                        className="flex-1 min-h-[48px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-98"
                                    >
                                        <Unlock className="w-4 h-4" />
                                        <span>Xác nhận nhập PIN & Mở chốt tủ</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* PROOF OF DELIVERY & PUT IN BOX CONFIRMATION */}
                        <div className="rounded-3xl bg-slate-900/90 border border-cyan-500/30 p-6 shadow-2xl backdrop-blur-xl">
                            <div className="flex items-center gap-2 mb-3">
                                <Camera className="w-5 h-5 text-cyan-400" />
                                <h3 className="text-sm font-extrabold text-white">
                                    Chụp ảnh xác nhận đã đặt hàng vào trong hộc tủ
                                </h3>
                            </div>
                            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                                Đặt kiện hàng vào bên trong hộc tủ, chụp lại ảnh kiện hàng để gửi bằng chứng giao hàng cho Chủ sở hữu.
                            </p>

                            {/* Photo input or preview */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handlePhotoSelect}
                                className="hidden"
                            />

                            {proofImage ? (
                                <div className="space-y-3 mb-4">
                                    <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/50 max-h-60 bg-black flex items-center justify-center">
                                        <img
                                            src={proofImage}
                                            alt="Proof of Delivery"
                                            className="w-full h-auto object-cover max-h-56"
                                        />
                                        <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-emerald-500/90 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                                            ✓ Ảnh đã sẵn sàng
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5"
                                        >
                                            <Camera className="w-3.5 h-3.5" />
                                            <span>Chụp lại ảnh khác</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setProofImage(null)}
                                            className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3 mb-4">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full min-h-[90px] border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 rounded-2xl bg-cyan-500/5 hover:bg-cyan-500/10 flex flex-col items-center justify-center text-cyan-300 transition-all p-4 cursor-pointer"
                                    >
                                        <Camera className="w-7 h-7 mb-1.5 text-cyan-400" />
                                        <span className="text-xs font-bold">Chạm để mở Camera chụp ảnh kiện hàng</span>
                                        <span className="text-[10px] text-slate-400 mt-0.5">Tự động nén ảnh tối ưu tốc độ</span>
                                    </button>

                                    {/* Quick Demo buttons for instant desktop testing */}
                                    <div className="pt-1">
                                        <span className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                                            Hoặc chọn ảnh mẫu nhanh (Dùng thử trên máy tính):
                                        </span>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleQuickDemoPhoto('Shopee Express')}
                                                className="py-2 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-200 truncate"
                                            >
                                                📦 Kiện Shopee
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleQuickDemoPhoto('Lazada')}
                                                className="py-2 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-200 truncate"
                                            >
                                                📦 Hộp Lazada
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleQuickDemoPhoto('GHTK')}
                                                className="py-2 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-200 truncate"
                                            >
                                                📦 Thùng Carton
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* BIG GREEN CONFIRM BUTTON */}
                            <button
                                type="button"
                                disabled={confirmingPutInBox}
                                onClick={handleConfirmPutInBox}
                                className="w-full min-h-[54px] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-60"
                            >
                                {confirmingPutInBox ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
                                        <span>Đang xác nhận đóng tủ...</span>
                                    </>
                                ) : (
                                    <>
                                        <PackageCheck className="w-6 h-6 text-slate-950" />
                                        <span>Xác nhận đã bỏ hàng vào tủ & Đóng cửa</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* VIEW 4: Completed - Parcel in Locker */}
                {status === 'PARCEL_IN_LOCKER' && (
                    <div className="rounded-3xl bg-slate-900/90 border-2 border-emerald-500/50 p-6 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
                            <CheckCheck className="w-9 h-9" />
                        </div>

                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-black mb-2 uppercase tracking-wide border border-emerald-500/30">
                            ✓ GIAO HÀNG VÀO TỦ THÀNH CÔNG
                        </span>

                        <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-2">
                            Hàng đã được cất an toàn trong tủ!
                        </h2>
                        <p className="text-xs text-slate-300 max-w-sm mx-auto mb-6 leading-relaxed">
                            Cửa tủ đã chốt khóa an toàn. Thông báo kèm ảnh chụp xác nhận đã được gửi ngay lập tức tới điện thoại Chủ tủ.
                        </p>

                        {/* Summary details */}
                        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left text-xs space-y-2.5 mb-6">
                            <div className="flex justify-between items-center text-slate-400">
                                <span>Trạng thái hộc tủ:</span>
                                <span className="font-bold text-emerald-400 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                    Đang chứa hàng & Đã khóa
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400">
                                <span>Thời gian ghi nhận:</span>
                                <span className="font-mono text-slate-200">
                                    {new Date().toLocaleTimeString('vi-VN')} - {new Date().toLocaleDateString('vi-VN')}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400">
                                <span>Tủ nhận:</span>
                                <span className="font-mono font-bold text-cyan-300">{boxId?.toUpperCase()}</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={resetToForm}
                            className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all"
                        >
                            Hoàn tất & Quay lại trang chính
                        </button>
                    </div>
                )}

                {/* VIEW 5: Rejected Screen */}
                {status === 'REJECTED' && (
                    <div className="rounded-3xl bg-slate-900/90 border border-rose-500/40 p-6 shadow-2xl backdrop-blur-xl text-center">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                            <XCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Yêu cầu chưa được phê duyệt</h2>
                        <p className="text-xs text-rose-300 mb-4">
                            {requestData?.reason || requestData?.notes || 'Chủ tủ chưa thể xác nhận yêu cầu mở tủ lúc này.'}
                        </p>
                        <p className="text-xs text-slate-400 mb-6">
                            Vui lòng liên hệ trực tiếp với người nhận hoặc thử gửi lại.
                        </p>
                        <button
                            type="button"
                            onClick={resetToForm}
                            className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
                        >
                            Gửi lại yêu cầu khác
                        </button>
                    </div>
                )}
            </main>

            {/* Public Footer */}
            <footer className="border-t border-slate-900 p-4 text-center text-slate-500 text-[11px]">
                <p>© {new Date().getFullYear()} Lockship. Hệ thống tủ khóa thông minh IoT 24/7.</p>
            </footer>
        </div>
    )
}
