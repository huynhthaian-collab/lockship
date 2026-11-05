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
    Camera,
    Image as ImageIcon,
    PackageCheck,
    Unlock,
    Lock,
} from 'lucide-react'
import Card from '../ui/Card.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { Link } from 'react-router-dom'
import { ownerAccessApi } from '../../services/ownerApi.js'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import DeliveryStatusStepper from '../delivery/DeliveryStatusStepper.jsx'

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

    // Filter tab: 'ALL' | 'PENDING' | 'IN_LOCKER'
    const [activeTab, setActiveTab] = useState('ALL')

    // Active Modal States
    const [selectedRequest, setSelectedRequest] = useState(null)
    const [selectedOrderId, setSelectedOrderId] = useState('')
    const [actionNotes, setActionNotes] = useState('')
    const [responding, setResponding] = useState(false)
    const [responseResult, setResponseResult] = useState(null)

    // QR Preview Modal State
    const [showQrModal, setShowQrModal] = useState(false)
    const [selectedBoxForQr, setSelectedBoxForQr] = useState('LOCKSHIP-BOX-001')
    const [copiedUrl, setCopiedUrl] = useState(false)

    // Proof Photo Zoom Modal
    const [photoModalData, setPhotoModalData] = useState(null)

    // Live Toast Alert
    const [toastAlert, setToastAlert] = useState(null)

    const fetchRequests = useCallback(async () => {
        try {
            // Fetch all requests so owner sees both PENDING and in-progress/delivered requests
            const data = await ownerAccessApi.list()
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

    // Real-time listener: new shipper request
    const handleNewRequest = useCallback(
        (payload) => {
            playChime()
            setToastAlert({
                type: 'NEW_REQUEST',
                title: 'Yêu cầu mở tủ mới!',
                message: `${payload.shipperName || 'Shipper'} (${payload.shipperPhone}) đang chờ mở tủ ${payload.boxId}.`,
                time: new Date(),
            })
            fetchRequests()
        },
        [fetchRequests]
    )

    // Real-time listener: shipper opened locker door
    const handleUnlocked = useCallback(
        (payload) => {
            setToastAlert({
                type: 'UNLOCKED',
                title: '🔓 Shipper vừa mở khóa tủ!',
                message: `Shipper đã nhập mã mở tủ ${payload.boxId || ''}. Đang thao tác bỏ kiện hàng vào tủ...`,
                time: new Date(),
            })
            fetchRequests()
        },
        [fetchRequests]
    )

    // Real-time listener: parcel safely in locker
    const handleParcelDelivered = useCallback(
        (payload) => {
            playChime()
            setToastAlert({
                type: 'PARCEL_DELIVERED',
                title: '📦 HÀNG ĐÃ BỎ VÀO TỦ & KHÓA AN TOÀN!',
                message: `Kiện hàng đã nằm trong tủ ${payload.boxId || ''} lúc ${new Date().toLocaleTimeString('vi-VN')}. Bạn có thể ra lấy hàng bất cứ lúc nào!`,
                time: new Date(),
            })
            fetchRequests()
        },
        [fetchRequests]
    )

    useSocketEvent('new_box_request', handleNewRequest)
    useSocketEvent('box_unlocked_for_delivery', handleUnlocked)
    useSocketEvent('box_parcel_delivered', handleParcelDelivered)
    useSocketEvent('parcel_confirmed', handleParcelDelivered)

    const handleOpenRespondModal = (req) => {
        setSelectedRequest(req)
        setActionNotes('')
        setResponseResult(null)

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
                message:
                    action === 'APPROVE'
                        ? `Đã phê duyệt thành công! Mã PIN ${res.unlockCode} đã được gửi trực tiếp tới điện thoại Shipper.`
                        : 'Đã từ chối yêu cầu mở tủ.',
            })
            fetchRequests()
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

    // Filter requests by activeTab
    const pendingCount = requests.filter((r) => r.status === 'PENDING').length
    const inLockerCount = requests.filter((r) => r.status === 'PARCEL_IN_LOCKER').length

    const filteredRequests = requests.filter((req) => {
        if (activeTab === 'PENDING') return req.status === 'PENDING'
        if (activeTab === 'IN_LOCKER')
            return ['PARCEL_IN_LOCKER', 'UNLOCKED_FOR_DELIVERY', 'APPROVED'].includes(req.status)
        return true
    })

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Real-time Notification Banner */}
            {toastAlert && (
                <div
                    className={`flex items-center justify-between p-4 rounded-2xl border shadow-xl animate-fade-in ${
                        toastAlert.type === 'PARCEL_DELIVERED'
                            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                            : toastAlert.type === 'UNLOCKED'
                            ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                            : 'bg-cyan-950/60 border-cyan-500/50 text-cyan-200'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <span
                            className={`p-2 rounded-xl ${
                                toastAlert.type === 'PARCEL_DELIVERED'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : toastAlert.type === 'UNLOCKED'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-cyan-500/20 text-cyan-300'
                            }`}
                        >
                            {toastAlert.type === 'PARCEL_DELIVERED' ? (
                                <PackageCheck className="w-5 h-5 animate-bounce" />
                            ) : toastAlert.type === 'UNLOCKED' ? (
                                <Unlock className="w-5 h-5 animate-pulse" />
                            ) : (
                                <Radio className="w-5 h-5 animate-pulse" />
                            )}
                        </span>
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider">{toastAlert.title}</p>
                            <p className="text-xs opacity-90 mt-0.5">{toastAlert.message}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setToastAlert(null)}
                        className="text-xs opacity-80 hover:opacity-100 px-3 py-1.5 rounded-xl bg-white/10 ml-3"
                    >
                        Đóng
                    </button>
                </div>
            )}

            {/* Main Section Card */}
            <Card
                title={
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            <QrCode className="w-4 h-4" />
                        </span>
                        <span className="font-extrabold text-white text-base">
                            Quản lý Giao nhận & Mở tủ Shipper (Quét mã QR)
                        </span>
                    </div>
                }
                description="Tiếp nhận, xác thực đơn hàng và theo dõi thời gian thực quá trình shipper mở tủ, bỏ hàng & chụp ảnh xác nhận."
                action={
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setRefreshing(true)
                                fetchRequests()
                            }}
                            disabled={refreshing}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10 transition-all"
                            title="Tải lại danh sách"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Làm mới</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowQrModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-extrabold border border-cyan-500/30 transition-all shadow-sm shadow-cyan-500/20"
                        >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Mã QR dán trên Box</span>
                        </button>
                    </div>
                }
            >
                {/* Status Filter Tabs */}
                <div className="flex flex-wrap items-center gap-2 mb-4 pb-2 border-b border-slate-800">
                    <button
                        type="button"
                        onClick={() => setActiveTab('ALL')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'ALL'
                                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                    >
                        Tất cả ({requests.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('PENDING')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            activeTab === 'PENDING'
                                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                    >
                        <span>Chờ phê duyệt</span>
                        {pendingCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400/30 text-amber-200">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('IN_LOCKER')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            activeTab === 'IN_LOCKER'
                                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                    >
                        <span>Đang có hàng trong tủ</span>
                        {inLockerCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-400/30 text-emerald-200">
                                {inLockerCount}
                            </span>
                        )}
                    </button>
                </div>

                {loading ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                        <RefreshCw className="w-6 h-6 mx-auto mb-2.5 animate-spin text-cyan-400" />
                        Đang đồng bộ yêu cầu mở tủ...
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <EmptyState
                        title="Không có yêu cầu giao nhận nào phù hợp"
                        description="Khi shipper vãng lai đến giao hàng và quét mã QR dán trên Box, yêu cầu mở tủ sẽ xuất hiện tại đây cùng chuông báo real-time."
                        action={
                            <button
                                type="button"
                                onClick={() => setShowQrModal(true)}
                                className="ui-button-secondary text-xs inline-flex items-center gap-2"
                            >
                                <Eye className="w-4 h-4" />
                                <span>Xem & Thử nghiệm quét QR Box</span>
                            </button>
                        }
                    />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredRequests.map((req) => {
                            const isPending = req.status === 'PENDING'
                            const isUnlocked = req.status === 'UNLOCKED_FOR_DELIVERY'
                            const isParcelInLocker = req.status === 'PARCEL_IN_LOCKER'
                            const isCompleted = req.status === 'COMPLETED'
                            const isApproved = req.status === 'APPROVED'

                            const matchingDeliveries = candidateDeliveries.filter(
                                (d) => d.boxId?.toLowerCase() === req.boxId?.toLowerCase()
                            )

                            return (
                                <div
                                    key={req._id}
                                    className={`rounded-3xl border p-5 backdrop-blur-md shadow-xl transition-all flex flex-col justify-between ${
                                        isParcelInLocker
                                            ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/30 to-slate-900/80'
                                            : isUnlocked
                                            ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/30 to-slate-900/80 animate-pulse'
                                            : isPending
                                            ? 'border-cyan-500/30 bg-slate-900/70 hover:border-cyan-500/60'
                                            : 'border-slate-800 bg-slate-900/60'
                                    }`}
                                >
                                    <div className="space-y-3">
                                        {/* Header Badges */}
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase tracking-wide">
                                                <Box className="w-3.5 h-3.5" />
                                                {req.boxId}
                                            </span>

                                            {/* Physical Compartment Status Indicator */}
                                            {isParcelInLocker ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                                    📦 Đang có hàng bên trong
                                                </span>
                                            ) : isUnlocked ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                                    🔓 Cửa tủ đang mở
                                                </span>
                                            ) : isPending ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                                    <Clock className="w-3 h-3" />
                                                    Chờ phê duyệt
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400">
                                                    📭 Tủ đang trống
                                                </span>
                                            )}
                                        </div>

                                        {/* Distinct Alert Banners for Stages */}
                                        {isUnlocked && (
                                            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                                                <Unlock className="w-4 h-4 shrink-0 text-amber-400 animate-bounce" />
                                                <span>
                                                    Shipper vừa mở khóa tủ <strong>{req.boxId}</strong> — Đang bỏ hàng vào tủ...
                                                </span>
                                            </div>
                                        )}

                                        {isParcelInLocker && (
                                            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs space-y-1">
                                                <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                                                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                                                    <span>HÀNG ĐÃ BỎ VÀO TỦ & KHÓA AN TOÀN!</span>
                                                </div>
                                                <p className="text-[11px] opacity-90 pl-5">
                                                    Kiện hàng đã nằm trong {req.boxId} lúc {new Date(req.deliveredAt || req.updatedAt).toLocaleTimeString('vi-VN')}. Bạn có thể ra lấy hàng.
                                                </p>
                                            </div>
                                        )}

                                        {/* Stepper */}
                                        <div className="pt-1">
                                            <DeliveryStatusStepper currentStatus={req.status} />
                                        </div>

                                        {/* Shipper & Delivery Details */}
                                        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 text-xs">
                                            <div className="flex items-center justify-between text-white font-bold">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{req.shipperName || 'Shipper vãng lai'}</span>
                                                </div>
                                                <span className="font-mono text-emerald-400">
                                                    <a href={`tel:${req.shipperPhone}`} className="hover:underline">
                                                        {req.shipperPhone}
                                                    </a>
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-slate-400 text-[11px]">
                                                <span>Nguồn hàng:</span>
                                                <span className="font-bold text-amber-300">{req.deliverySource}</span>
                                            </div>

                                            {req.packageDescription && (
                                                <div className="pt-1 text-[11px] text-slate-300 italic border-t border-slate-800/60">
                                                    "{req.packageDescription}"
                                                </div>
                                            )}

                                            {req.unlockCode && (
                                                <div className="pt-1 flex justify-between items-center text-[11px] border-t border-slate-800/60">
                                                    <span className="text-slate-400">Mã PIN mở tủ:</span>
                                                    <span className="font-mono font-bold text-cyan-300">{req.unlockCode}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Proof of Delivery Photo Thumbnail */}
                                        {req.deliveryProofImage && (
                                            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <img
                                                        src={req.deliveryProofImage}
                                                        alt="Proof thumbnail"
                                                        className="w-12 h-12 rounded-xl object-cover border border-emerald-500/40 bg-black cursor-pointer"
                                                        onClick={() => setPhotoModalData(req)}
                                                    />
                                                    <div>
                                                        <p className="text-xs font-bold text-white flex items-center gap-1">
                                                            <Camera className="w-3.5 h-3.5 text-emerald-400" />
                                                            Ảnh chụp trong tủ
                                                        </p>
                                                        <p className="text-[10px] text-slate-400">
                                                            {new Date(req.deliveredAt || req.updatedAt).toLocaleTimeString('vi-VN')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => setPhotoModalData(req)}
                                                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-all border border-emerald-500/30 flex items-center gap-1"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>Xem ảnh</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Row */}
                                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                                        <span className="text-[11px] text-slate-400">
                                            {new Date(req.createdAt).toLocaleTimeString('vi-VN', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                day: '2-digit',
                                                month: '2-digit',
                                            })}
                                        </span>

                                        {isPending ? (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenRespondModal(req)}
                                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/25 inline-flex items-center gap-1.5 transition-all active:scale-95"
                                            >
                                                <KeyRound className="w-3.5 h-3.5" />
                                                <span>Xác thực & Cấp mã mở tủ</span>
                                            </button>
                                        ) : req.deliveryProofImage ? (
                                            <button
                                                type="button"
                                                onClick={() => setPhotoModalData(req)}
                                                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs inline-flex items-center gap-1.5 transition-all"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Xem chi tiết & Ảnh</span>
                                            </button>
                                        ) : (
                                            <span className="text-xs text-slate-400 font-medium">
                                                {isApproved ? 'Đã cấp PIN' : isCompleted ? 'Đã hoàn tất' : 'Đang xử lý'}
                                            </span>
                                        )}
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
                    <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                            <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-base">
                                <KeyRound className="w-5 h-5" />
                                <span>Xác thực đơn hàng & Cấp mã mở tủ</span>
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
                                    className="ui-button-primary text-xs w-full py-3 rounded-2xl"
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
                                        <span>Yêu cầu xác nhận đơn hàng trước khi cấp mã:</span>
                                    </div>
                                    <p className="leading-relaxed text-[11px] text-amber-200/90">
                                        Vui lòng kiểm tra mã vận đơn (Shopee, Lazada, TikTok, hóa đơn...)
                                        hoặc liên hệ Shipper qua SĐT <strong>{selectedRequest.shipperPhone}</strong> để xác nhận kiện hàng đúng của bạn trước khi mở chốt khóa tủ.
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
                                            — Đơn hàng ngoài hệ thống (Shopee / Lazada / TikTok... không tạo trên web) —
                                        </option>
                                        {candidateDeliveries
                                            .filter((d) => d.boxId?.toLowerCase() === selectedRequest.boxId?.toLowerCase())
                                            .map((d) => (
                                                <option key={d._id} value={d._id}>
                                                    Đơn #{d._id.slice(-6).toUpperCase()} — {d.deliveryAddress} ({d.status})
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                {/* Optional Response Notes */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Ghi chú phản hồi (Tùy chọn):
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ví dụ: Đã kiểm tra Shopee, hộc tủ đã sẵn sàng..."
                                        value={actionNotes}
                                        onChange={(e) => setActionNotes(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
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
                                                <span>Xác nhận & Cấp mã mở tủ</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL 2: High-Resolution Proof Photo Zoom Modal */}
            {photoModalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl relative">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-base">
                                <Camera className="w-5 h-5" />
                                <span>Ảnh xác nhận kiện hàng trong tủ</span>
                            </div>
                            <button
                                onClick={() => setPhotoModalData(null)}
                                className="text-slate-400 hover:text-white text-sm p-1 rounded-lg"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Large Photo Preview */}
                        <div className="rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-black flex items-center justify-center mb-4">
                            <img
                                src={photoModalData.deliveryProofImage}
                                alt="Proof of delivery zoom"
                                className="w-full max-h-[380px] object-contain"
                            />
                        </div>

                        {/* Delivery Metadata */}
                        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2 mb-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Tủ lưu trữ:</span>
                                <span className="font-bold text-cyan-300 font-mono">{photoModalData.boxId}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Người giao hàng:</span>
                                <span className="font-semibold text-white">
                                    {photoModalData.shipperName} ({photoModalData.shipperPhone})
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Nguồn kiện hàng:</span>
                                <span className="font-semibold text-amber-400">{photoModalData.deliverySource}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Thời gian bỏ vào tủ:</span>
                                <span className="font-mono text-emerald-400">
                                    {new Date(photoModalData.deliveredAt || photoModalData.updatedAt).toLocaleString('vi-VN')}
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setPhotoModalData(null)}
                            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                        >
                            Đóng cửa sổ
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL 3: QR Code Preview for Testing & Printing */}
            {showQrModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl relative text-center">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 text-left">
                            <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-base">
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
                        <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-4 max-h-24 overflow-y-auto">
                            {['LOCKSHIP-BOX-001', 'LOCKSHIP-BOX-002', 'LOCKSHIP-BOX-003', 'LOCKSHIP-BOX-004', 'box-04'].map((bId) => (
                                <button
                                    key={bId}
                                    type="button"
                                    onClick={() => setSelectedBoxForQr(bId)}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
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
