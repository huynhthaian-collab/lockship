import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
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
    KeyRound,
    Sparkles,
} from 'lucide-react'
import { publicBoxApi } from '../../services/ownerApi.js'
import { createGuestSocket } from '../../services/socketClient.js'

const QUICK_SOURCES = [
    'Shopee',
    'TikTok Shop',
    'Lazada',
    'GHTK',
    'Viettel Post',
    'Giao Hàng Nhanh',
    'Cửa hàng ngoài',
]

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

    // Flow State: 'FORM' | 'WAITING' | 'APPROVED' | 'REJECTED'
    const [status, setStatus] = useState('FORM')
    const [requestData, setRequestData] = useState(null)
    const [guestToken, setGuestToken] = useState(null)
    const [approvalData, setApprovalData] = useState(null)
    const [copied, setCopied] = useState(false)

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
                        address: 'Vị trí trạm tủ thông minh Lockship',
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

    // 2. Establish Real-time Socket & Polling when entering WAITING state
    useEffect(() => {
        if (status !== 'WAITING' || !guestToken || !requestData) return

        const requestId = requestData._id || requestData.id

        // Setup real-time guest socket
        const socket = createGuestSocket(guestToken)
        socketRef.current = socket

        socket.on('connect', () => {
            console.log('Guest socket connected to room:', `request_${requestId}`)
        })

        socket.on('request_approved', (payload) => {
            console.log('Received request_approved event:', payload)
            setApprovalData(payload)
            setStatus('APPROVED')
        })

        socket.on('request_rejected', (payload) => {
            console.log('Received request_rejected event:', payload)
            setRequestData((prev) => ({ ...prev, ...payload }))
            setStatus('REJECTED')
        })

        // Backup polling every 3.5 seconds
        pollTimerRef.current = setInterval(async () => {
            try {
                const updated = await publicBoxApi.getStatus(boxId, requestId)
                if (updated?.status === 'APPROVED') {
                    setApprovalData({
                        unlockCode: updated.unlockCode,
                        orderInfo: updated.order,
                        message: 'Yêu cầu mở tủ đã được Chủ tủ phê duyệt!',
                    })
                    setStatus('APPROVED')
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

    const resetToForm = () => {
        setStatus('FORM')
        setRequestData(null)
        setGuestToken(null)
        setApprovalData(null)
        setError('')
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-white">
            {/* Top Navigation Bar */}
            <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 py-3 sm:px-6">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-lg">
                            <Box className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 text-lg tracking-tight">
                                LOCKSHIP
                            </span>
                            <span className="block text-[11px] text-slate-400 font-medium">
                                Smart Locker Access
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Box Scan</span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-md w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
                {/* Locker Information Header Card */}
                <div className="mb-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/50 border border-slate-800/80 p-4.5 shadow-xl backdrop-blur-md">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wide">
                                    Mã Tủ: {boxId?.toUpperCase()}
                                </span>
                                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Online
                                </span>
                            </div>
                            <h1 className="text-base font-bold text-white leading-snug">
                                {boxInfo?.name || `Trạm tủ thông minh Lockship #${boxId?.toUpperCase()}`}
                            </h1>
                            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                                {boxInfo?.address || 'Khu vực giao nhận thông minh Lockship 24/7'}
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-center text-cyan-400 shrink-0">
                            <Lock className="w-5 h-5 text-cyan-400" />
                        </div>
                    </div>
                </div>

                {/* VIEW 1: Input Form */}
                {status === 'FORM' && (
                    <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 sm:p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="mb-5">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-medium border border-amber-500/20 mb-2">
                                <Sparkles className="w-3.5 h-3.5" />
                                Dành cho Shipper vãng lai (Không cần tài khoản)
                            </div>
                            <h2 className="text-xl font-bold text-white">Yêu cầu mở tủ giao hàng</h2>
                            <p className="text-xs text-slate-400 mt-1">
                                Điền số điện thoại và nguồn hàng để gửi thông báo trực tiếp đến Chủ sở hữu tủ khóa.
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Shipper Phone */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
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
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Shipper Name */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Họ tên người giao (Tùy chọn)
                                </label>
                                <div className="relative">
                                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Ví dụ: Nguyễn Văn A"
                                        value={form.shipperName}
                                        onChange={(e) => setForm({ ...form, shipperName: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Delivery Source */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Đơn hàng được giao từ đâu?
                                </label>
                                <div className="flex flex-wrap gap-1.5 mb-2.5">
                                    {QUICK_SOURCES.map((src) => (
                                        <button
                                            key={src}
                                            type="button"
                                            onClick={() => setForm({ ...form, deliverySource: src })}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                                form.deliverySource === src
                                                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700/80 border border-slate-700'
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
                                        placeholder="Hoặc nhập tên cửa hàng / đơn vị vận chuyển khác"
                                        value={form.deliverySource}
                                        onChange={(e) => setForm({ ...form, deliverySource: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Package Note */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Ghi chú kiện hàng (Tùy chọn)
                                </label>
                                <div className="relative">
                                    <Package className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                                    <textarea
                                        rows={2}
                                        placeholder="Ví dụ: Kiện quần áo hộp vuông, giao trước 17h..."
                                        value={form.packageDescription}
                                        onChange={(e) => setForm({ ...form, packageDescription: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors resize-none"
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                            >
                                {submitting ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Đang gửi yêu cầu...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Gửi yêu cầu mở tủ</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {/* VIEW 2: Waiting Screen (Pulse Radar Animation) */}
                {status === 'WAITING' && (
                    <div className="rounded-3xl bg-slate-900/80 border border-cyan-500/30 p-6 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
                        {/* Radar Pulse Effect */}
                        <div className="relative w-28 h-28 mx-auto my-4 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping opacity-60" />
                            <div className="absolute inset-2 rounded-full bg-cyan-500/30 animate-pulse" />
                            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/40 text-white">
                                <Clock className="w-8 h-8 animate-spin" style={{ animationDuration: '6s' }} />
                            </div>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold mb-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            Đã kết nối Real-time với Chủ tủ
                        </div>

                        <h2 className="text-xl font-bold text-white mb-2">Đang chờ chủ tủ xác nhận...</h2>
                        <p className="text-xs text-slate-300 max-w-xs mx-auto mb-6 leading-relaxed">
                            Thông báo đã được gửi đến điện thoại và email của Chủ sở hữu tủ khóa.
                            Màn hình sẽ <strong>tự động cập nhật mã mở tủ (PIN)</strong> ngay khi Chủ tủ phê duyệt.
                        </p>

                        {/* Request Summary Box */}
                        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-left text-xs space-y-2 mb-6">
                            <div className="flex justify-between items-center text-slate-400">
                                <span>Tủ đích:</span>
                                <span className="font-semibold text-white">{boxId?.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400">
                                <span>SĐT Shipper:</span>
                                <span className="font-semibold text-cyan-400">{form.shipperPhone}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400">
                                <span>Nguồn hàng:</span>
                                <span className="font-semibold text-amber-400">{form.deliverySource}</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={resetToForm}
                            className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Hủy hoặc gửi lại yêu cầu khác
                        </button>
                    </div>
                )}

                {/* VIEW 3: Approved Screen (Big PIN Code) */}
                {status === 'APPROVED' && (
                    <div className="rounded-3xl bg-slate-900/90 border border-emerald-500/40 p-6 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold mb-2">
                            XÁC NHẬN THÀNH CÔNG
                        </div>
                        <h2 className="text-xl font-bold text-white mb-1">Chủ tủ đã phê duyệt!</h2>
                        <p className="text-xs text-slate-300 mb-5">
                            Dưới đây là <strong>Mã mở tủ (PIN code)</strong> an toàn để bạn mở hộc tủ và đặt kiện hàng:
                        </p>

                        {/* GIANT PIN CODE CARD */}
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/50 shadow-2xl mb-5">
                            <span className="block text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-1.5">
                                MÃ MỞ TỦ (PIN CODE)
                            </span>
                            <div className="text-4xl sm:text-5xl font-black text-white tracking-[0.25em] font-mono my-2 select-all text-center">
                                {approvalData?.unlockCode || '888888'}
                            </div>

                            <button
                                type="button"
                                onClick={copyPinCode}
                                className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all border border-emerald-500/30"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Đã sao chép mã PIN!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Sao chép mã PIN</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Step-by-Step Locker Guide */}
                        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-left text-xs space-y-2.5 mb-5">
                            <div className="font-bold text-slate-200 flex items-center gap-1.5">
                                <KeyRound className="w-4 h-4 text-cyan-400" />
                                Hướng dẫn thao tác tại tủ:
                            </div>
                            <ol className="list-decimal pl-4 space-y-1.5 text-slate-300 leading-relaxed">
                                <li>Đến trước bàn phím cảm ứng trên tủ <strong>{boxId?.toUpperCase()}</strong>.</li>
                                <li>Bấm phím <strong>#</strong>, nhập 6 số PIN ở trên, sau đó bấm <strong>#</strong> để xác nhận.</li>
                                <li>Cửa hộc tủ sẽ bật mở tự động. Đặt kiện hàng vào và <strong>đóng chặt cửa tủ</strong>.</li>
                            </ol>
                        </div>

                        <button
                            type="button"
                            onClick={resetToForm}
                            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
                        >
                            Hoàn tất & Đóng màn hình
                        </button>
                    </div>
                )}

                {/* VIEW 4: Rejected Screen */}
                {status === 'REJECTED' && (
                    <div className="rounded-3xl bg-slate-900/90 border border-rose-500/40 p-6 shadow-2xl backdrop-blur-xl text-center">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                            <XCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Yêu cầu bị từ chối</h2>
                        <p className="text-xs text-rose-300 mb-4">
                            {requestData?.reason || requestData?.notes || 'Chủ tủ chưa thể xác nhận hoặc từ chối yêu cầu mở tủ lúc này.'}
                        </p>
                        <p className="text-xs text-slate-400 mb-6">
                            Vui lòng liên hệ trực tiếp với người nhận hoặc kiểm tra lại thông tin đơn hàng.
                        </p>
                        <button
                            type="button"
                            onClick={resetToForm}
                            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
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
