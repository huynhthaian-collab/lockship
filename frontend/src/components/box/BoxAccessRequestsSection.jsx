import React, { useState, useEffect, useCallback } from 'react'
import {
    QrCode,
    Box,
    Phone,
    User,
    Truck,
    Package,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    KeyRound,
    ExternalLink,
    RefreshCw,
    ShieldAlert,
    Copy,
    Check,
    Radio,
    Sparkles,
    Eye,
} from 'lucide-react'
import Card from '../ui/Card.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { ownerAccessApi } from '../../services/ownerApi.js'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import { LOCKSHIP_BOXES } from '../../data/smartLockerBoxes.js'

function playChime() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        if (!AudioContext) return
        const ctx = new AudioContext()
        const now = ctx.currentTime

        // Note 1: High tone
        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.type = 'sine'
        osc1.frequency.setValueAtTime(587.33, now) // D5
        gain1.gain.setValueAtTime(0.2, now)
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
        osc1.connect(gain1)
        gain1.connect(ctx.destination)
        osc1.start(now)
        osc1.stop(now + 0.3)

        // Note 2: Higher chime tone
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(880, now + 0.15) // A5
        gain2.gain.setValueAtTime(0.25, now + 0.15)
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.start(now + 0.15)
        osc2.stop(now + 0.6)
    } catch {
        // audio not supported or blocked
    }
}

export default function BoxAccessRequestsSection({ className = '' }) {
    const [requests, setRequests] = useState([])
    const [candidateDeliveries, setCandidateDeliveries] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState('')

    // Active Modal States
    const [selectedRequest, setSelectedRequest] = useState(null)
    const [selectedOrderId, setSelectedOrderId] = useState('')
    const [actionNotes, setActionNotes] = useState('')
    const [responding, setResponding] = useState(false)
    const [responseResult, setResponseResult] = useState(null)

    // QR Preview Modal State
    const [showQrModal, setShowQrModal] = useState(false)
    const [selectedBoxForQr, setSelectedBoxForQr] = useState('box-04')
    const [copiedUrl, setCopiedUrl] = useState(false)

    // Live Toast Alert
    const [toastAlert, setToastAlert] = useState(null)

    const fetchRequests = useCallback(async () => {
        try {
            const data = await ownerAccessApi.list('PENDING')
            setRequests(data.requests || [])
            setCandidateDeliveries(data.candidateDeliveries || [])
        } catch (err) {
            console.warn('Could not load access requests:', err)
            setError(err.message || 'Không thể tải danh sách yêu cầu mở tủ.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        fetchRequests()
    }, [fetchRequests])

    // Real-time listener for new requests
    const handleNewRequest = useCallback((payload) => {
        playChime()
        setToastAlert({
            title: 'Yêu cầu mở tủ mới!',
            message: `${payload.shipperName || 'Shipper'} (${payload.shipperPhone}) đang chờ mở tủ ${payload.boxId}.`,
            time: new Date(),
        })
        fetchRequests()
    }, [fetchRequests])

    useSocketEvent('new_box_request', handleNewRequest)

    const handleOpenRespondModal = (req) => {
        setSelectedRequest(req)
        setActionNotes('')
        setResponseResult(null)

        // Find candidate deliveries matching this boxId
        const matching = candidateDeliveries.filter(
            (d) => d.boxId?.toLowerCase() === req.boxId?.toLowerCase()
        )
        if (matching.length > 0) {
            setSelectedOrderId(matching[0]._id)
        } else {
            setSelectedOrderId('')
        }
    }

    const handleCloseModal = () => {
        setSelectedRequest(null)
        setResponseResult(null)
        fetchRequests()
    }

    const handleExecuteResponse = async (action) => {
        if (!selectedRequest) return
        setResponding(true)
        setError('')
        try {
            const payload = {
                action,
                orderId: selectedOrderId || null,
                notes: actionNotes.trim() || undefined,
            }
            const res = await ownerAccessApi.respond(selectedRequest._id, payload)
            setResponseResult({
                action,
                unlockCode: res.unlockCode,
                message: action === 'APPROVE'
                    ? `Đã phê duyệt thành công! Mã PIN ${res.unlockCode} đã được gửi trực tiếp tới điện thoại Shipper.`
                    : 'Đã từ chối yêu cầu mở tủ.',
            })
            // Remove from local list
            setRequests((prev) => prev.filter((r) => r._id !== selectedRequest._id))
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Không thể xử lý yêu cầu.')
        } finally {
            setResponding(false)
        }
    }

    const getScanUrl = (boxId) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
        return `${origin}/public/box-scan/${boxId}`
    }

    const handleCopyQrLink = (boxId) => {
        const url = getScanUrl(boxId)
        navigator.clipboard.writeText(url)
        setCopiedUrl(true)
        setTimeout(() => setCopiedUrl(false), 2000)
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Real-time Notification Banner */}
            {toastAlert && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border border-amber-500/40 text-amber-200 shadow-xl animate-bounce">
                    <div className="flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-amber-500/30 text-amber-300">
                            <Radio className="w-5 h-5 animate-pulse" />
                        </span>
                        <div>
                            <p className="text-xs font-bold text-white uppercase tracking-wider">{toastAlert.title}</p>
                            <p className="text-xs text-amber-200">{toastAlert.message}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setToastAlert(null)}
                        className="text-xs text-amber-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/10"
                    >
                        Đóng
                    </button>
                </div>
            )}

            {/* Main Section Card */}
            <Card
                title={
                    <div className="flex items-center gap-2.5">
                        <span className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            <QrCode className="w-4 h-4" />
                        </span>
                        <span>Yêu cầu mở tủ từ Shipper vãng lai (Quét mã QR Box)</span>
                        {requests.length > 0 && (
                            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                                {requests.length} chờ duyệt
                            </span>
                        )}
                    </div>
                }
                description="Tiếp nhận và xác thực yêu cầu mở tủ tức thì từ Shipper quét mã QR dán trên từng Box (không cần tài khoản)."
                action={
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setRefreshing(true)
                                fetchRequests()
                            }}
                            disabled={refreshing}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-all"
                            title="Tải lại danh sách"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Làm mới</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowQrModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-bold border border-cyan-500/30 transition-all shadow-sm shadow-cyan-500/20"
                        >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Mã QR dán trên Box</span>
                        </button>
                    </div>
                }
            >
                {loading ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                        <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-cyan-400" />
                        Đang đồng bộ yêu cầu mở tủ...
                    </div>
                ) : requests.length === 0 ? (
                    <EmptyState
                        title="Không có yêu cầu nào đang chờ duyệt"
                        description="Khi shipper vãng lai đến giao hàng và quét mã QR dán trên Box, yêu cầu mở tủ sẽ xuất hiện tại đây cùng chuông báo real-time."
                        action={
                            <button
                                type="button"
                                onClick={() => setShowQrModal(true)}
                                className="ui-button-secondary text-xs inline-flex items-center gap-1.5"
                            >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Xem & Thử nghiệm quét QR Box</span>
                            </button>
                        }
                    />
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {requests.map((req) => {
                            const matchingDeliveries = candidateDeliveries.filter(
                                (d) => d.boxId?.toLowerCase() === req.boxId?.toLowerCase()
                            )
                            return (
                                <div
                                    key={req._id}
                                    className="rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-4 backdrop-blur-md shadow-lg transition-all hover:border-cyan-500/50 hover:bg-slate-900/90 flex flex-col justify-between"
                                >
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wide">
                                                <Box className="w-3.5 h-3.5" />
                                                {req.boxId}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                                                <Clock className="w-3 h-3" />
                                                Chờ phê duyệt
                                            </span>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm font-bold text-white">
                                                <User className="w-4 h-4 text-slate-400 shrink-0" />
                                                <span>{req.shipperName || 'Shipper vãng lai'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
                                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <a href={`tel:${req.shipperPhone}`} className="hover:underline">
                                                    {req.shipperPhone}
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-amber-300">
                                                <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span>Nguồn: <strong>{req.deliverySource}</strong></span>
                                            </div>
                                            {req.packageDescription && (
                                                <div className="flex items-start gap-2 text-xs text-slate-300 bg-slate-950/50 p-2 rounded-lg border border-white/5">
                                                    <Package className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                                    <span className="line-clamp-2">{req.packageDescription}</span>
                                                </div>
                                            )}
                                        </div>

                                        {matchingDeliveries.length > 0 && (
                                            <div className="text-[11px] px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300">
                                                Có <strong>{matchingDeliveries.length}</strong> đơn web sẵn sàng liên kết
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                                        <span className="text-[11px] text-slate-400">
                                            {new Date(req.createdAt).toLocaleTimeString('vi-VN', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenRespondModal(req)}
                                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/25 inline-flex items-center gap-1.5 transition-transform active:scale-95"
                                        >
                                            <KeyRound className="w-3.5 h-3.5" />
                                            <span>Xác thực & Mở tủ</span>
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </Card>

            {/* MODAL 1: Mandatory Order Verification & Approval */}
            {selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                            <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
                                <KeyRound className="w-5 h-5" />
                                <span>Xác thực đơn hàng & Phê duyệt mở tủ</span>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="text-slate-400 hover:text-white text-sm p-1 rounded-lg"
                            >
                                ✕
                            </button>
                        </div>

                        {responseResult ? (
                            <div className="space-y-4 text-center py-4">
                                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Phê duyệt thành công!</h3>
                                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                                    {responseResult.message}
                                </p>
                                {responseResult.unlockCode && (
                                    <div className="p-4 rounded-2xl bg-slate-950 border-2 border-emerald-500/50 my-3">
                                        <span className="text-[11px] text-emerald-400 uppercase font-bold tracking-wider">
                                            Mã PIN đã cấp cho Shipper:
                                        </span>
                                        <div className="text-3xl font-black font-mono text-white tracking-widest mt-1">
                                            {responseResult.unlockCode}
                                        </div>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="ui-button-primary text-xs w-full py-2.5"
                                >
                                    Đóng & Hoàn tất
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Mandatory Check Notice */}
                                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1.5">
                                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        <span>Yêu cầu kiểm tra đơn hàng trước khi cấp mã:</span>
                                    </div>
                                    <p className="leading-relaxed text-[11px] text-amber-200/90">
                                        Vui lòng kiểm tra mã vận đơn bên ngoài (Shopee, Lazada, TikTok, hóa đơn...)
                                        hoặc liên hệ Shipper qua SĐT <strong>{selectedRequest.shipperPhone}</strong> để xác nhận kiện hàng hợp lệ trước khi cấp mã mở tủ.
                                    </p>
                                </div>

                                {/* Shipper Information Card */}
                                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Tủ yêu cầu:</span>
                                        <span className="font-bold text-cyan-400 uppercase">{selectedRequest.boxId}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Họ tên Shipper:</span>
                                        <span className="font-semibold text-white">{selectedRequest.shipperName}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Số điện thoại:</span>
                                        <a href={`tel:${selectedRequest.shipperPhone}`} className="font-mono text-emerald-400 hover:underline">
                                            {selectedRequest.shipperPhone}
                                        </a>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Nguồn đơn hàng:</span>
                                        <span className="font-semibold text-amber-400">{selectedRequest.deliverySource}</span>
                                    </div>
                                    {selectedRequest.packageDescription && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400">Ghi chú kiện:</span>
                                            <span className="text-slate-200">{selectedRequest.packageDescription}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Order Matching Selector */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                        Liên kết với đơn hàng có sẵn trên hệ thống (Tùy chọn):
                                    </label>
                                    <select
                                        value={selectedOrderId}
                                        onChange={(e) => setSelectedOrderId(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                                    >
                                        <option value="">
                                            — Đơn hàng ngoài hệ thống (Shopee / Lazada / Tiki... không tạo trên web) —
                                        </option>
                                        {candidateDeliveries
                                            .filter((d) => d.boxId?.toLowerCase() === selectedRequest.boxId?.toLowerCase())
                                            .map((d) => (
                                                <option key={d._id} value={d._id}>
                                                    Đơn #{d._id.slice(-6).toUpperCase()} — {d.deliveryAddress} ({d.status})
                                                </option>
                                            ))}
                                    </select>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        {selectedOrderId
                                            ? 'Khi duyệt, đơn hàng được chọn sẽ tự động chuyển sang trạng thái "DELIVERED_TO_LOCKER".'
                                            : 'Nếu không chọn đơn web, hệ thống ghi nhận giao hàng cho đơn bên ngoài và cấp mã PIN mở tủ bình thường.'}
                                    </p>
                                </div>

                                {/* Optional Response Notes */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Ghi chú phản hồi (Tùy chọn):
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ví dụ: Đã kiểm tra Shopee, hộc tủ số 3 mở sẵn..."
                                        value={actionNotes}
                                        onChange={(e) => setActionNotes(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                {error && (
                                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                                        {error}
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="pt-2 flex items-center justify-end gap-2.5">
                                    <button
                                        type="button"
                                        disabled={responding}
                                        onClick={() => handleExecuteResponse('REJECT')}
                                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                                    >
                                        Từ chối
                                    </button>
                                    <button
                                        type="button"
                                        disabled={responding}
                                        onClick={() => handleExecuteResponse('APPROVE')}
                                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 inline-flex items-center gap-1.5 transition-all active:scale-98"
                                    >
                                        {responding ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                <span>Đang xử lý...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span>Xác nhận giao hàng & Gửi mã mở tủ</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL 2: QR Code Preview for Testing & Printing */}
            {showQrModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/80 p-5 sm:p-6 shadow-2xl relative text-center">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 text-left">
                            <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
                                <QrCode className="w-5 h-5" />
                                <span>Mã QR dán trên từng Box</span>
                            </div>
                            <button
                                onClick={() => setShowQrModal(false)}
                                className="text-slate-400 hover:text-white text-sm p-1 rounded-lg"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Box Selector Tabs */}
                        <div className="flex items-center justify-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-4">
                            {['box-04', 'box-05', 'box-06'].map((bId) => (
                                <button
                                    key={bId}
                                    type="button"
                                    onClick={() => setSelectedBoxForQr(bId)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                                        selectedBoxForQr === bId
                                            ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {bId}
                                </button>
                            ))}
                        </div>

                        {/* Generated QR Code Preview */}
                        <div className="p-5 rounded-2xl bg-white mx-auto w-fit shadow-2xl border-4 border-cyan-500/30 mb-3">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                                    getScanUrl(selectedBoxForQr)
                                )}`}
                                alt={`QR Code for ${selectedBoxForQr}`}
                                className="w-48 h-48 block"
                            />
                        </div>

                        <p className="text-xs font-mono text-cyan-400 mb-1">
                            {getScanUrl(selectedBoxForQr)}
                        </p>
                        <p className="text-[11px] text-slate-400 mb-4">
                            Dán mã QR này lên thân tủ <strong>{selectedBoxForQr.toUpperCase()}</strong>.
                            Shipper dùng camera điện thoại quét mã sẽ trực tiếp mở trang yêu cầu mở tủ.
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleCopyQrLink(selectedBoxForQr)}
                                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 border border-slate-700"
                            >
                                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedUrl ? 'Đã sao chép!' : 'Sao chép Link'}</span>
                            </button>
                            <a
                                href={getScanUrl(selectedBoxForQr)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Mở thử trang Shipper</span>
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
