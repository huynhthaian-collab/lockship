import React, { useState, useEffect, useCallback } from 'react'
import {
    QrCode,
    Copy,
    Check,
    ExternalLink,
    Download,
    Smartphone,
    Globe,
    Sparkles,
    ShieldCheck,
    ShieldAlert,
    Box,
    CheckCircle2,
    ArrowRight,
    RefreshCw,
    Share2,
    Info,
    Laptop,
    Radio,
    Zap,
    Printer,
    Plus,
    Lock,
    AlertTriangle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import SpatialTiltCard from '../../components/spatial/SpatialTiltCard.jsx'
import { useAuth } from '../../context/useAuth.js'
import { boxApi } from '../../services/adminApi.js'

const PRESET_BOXES = [
    {
        id: 'LOCKSHIP-BOX-001',
        name: 'Tủ #001 (Bến Ninh Kiều)',
        address: 'Số 2 Đường Hai Bà Trưng, P. Tân An, Q. Ninh Kiều, Cần Thơ',
        battery: 95,
        status: 'online',
    },
    {
        id: 'LOCKSHIP-BOX-002',
        name: 'Tủ #002 (ĐH Cần Thơ - Khu II)',
        address: 'Khu II, Đường 3 Tháng 2, P. Xuân Khánh, Q. Ninh Kiều, Cần Thơ',
        battery: 88,
        status: 'online',
    },
    {
        id: 'LOCKSHIP-BOX-003',
        name: 'Tủ #003 (Vincom Hùng Vương)',
        address: 'Số 2 Đường Hùng Vương, P. Thới Bình, Q. Ninh Kiều, Cần Thơ',
        battery: 78,
        status: 'online',
    },
    {
        id: 'LOCKSHIP-BOX-004',
        name: 'Tủ #004 (Lotte Mart Cần Thơ)',
        address: 'Số 84 Đường Mậu Thân, P. An Hòa, Q. Ninh Kiều, Cần Thơ',
        battery: 45,
        status: 'offline',
    },
    {
        id: 'box-04',
        name: 'Lockship Box #04 (Trung tâm Bến Ninh Kiều)',
        address: 'Bến Ninh Kiều, Cần Thơ',
        battery: 98,
        status: 'online',
    },
    {
        id: 'box-05',
        name: 'Lockship Box #05 (Cổng ĐH Cần Thơ)',
        address: 'Cổng B Đại Học Cần Thơ',
        battery: 89,
        status: 'online',
    },
]

export default function QrCodeTesterPage({ role }) {
    const { user, isAuthenticated } = useAuth()
    const userRole = (user?.role || role || '').toLowerCase()
    const isAdmin = Boolean(isAuthenticated && userRole === 'admin')

    // Environment selector: 'production' | 'auto' | 'custom'
    const [envMode, setEnvMode] = useState('production')
    const [selectedBoxId, setSelectedBoxId] = useState('LOCKSHIP-BOX-001')
    const [customBoxId, setCustomBoxId] = useState('')
    const [customHost, setCustomHost] = useState('')
    const [copied, setCopied] = useState(false)
    const [qrSize, setQrSize] = useState(260)

    // Admin state
    const [dbBoxes, setDbBoxes] = useState([])
    const [loadingBoxes, setLoadingBoxes] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [generateNotice, setGenerateNotice] = useState('')
    const [errorMsg, setErrorMsg] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newBoxForm, setNewBoxForm] = useState({ boxId: '', name: '', address: '' })
    const [creatingBox, setCreatingBox] = useState(false)

    // Fetch dynamic boxes from backend if Admin
    const loadAdminBoxes = useCallback(async () => {
        if (!isAdmin) return
        setLoadingBoxes(true)
        try {
            const boxes = await boxApi.listBoxes()
            if (Array.isArray(boxes) && boxes.length > 0) {
                setDbBoxes(boxes)
            }
        } catch (err) {
            console.warn('Could not fetch boxes from backend:', err)
        } finally {
            setLoadingBoxes(false)
        }
    }, [isAdmin])

    useEffect(() => {
        if (isAdmin) {
            loadAdminBoxes()
        }
    }, [isAdmin, loadAdminBoxes])

    const activeBoxId = customBoxId.trim() || selectedBoxId

    // Compute Base Domain URL
    const getBaseUrl = () => {
        if (envMode === 'production') {
            return 'https://lockship-gamma.vercel.app'
        }
        if (envMode === 'custom' && customHost.trim()) {
            return customHost.trim().replace(/\/$/, '')
        }
        return typeof window !== 'undefined' ? window.location.origin : 'https://lockship-gamma.vercel.app'
    }

    const fullScanUrl = `${getBaseUrl()}/public/box-scan/${activeBoxId}`
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(
        fullScanUrl
    )}`

    const handleCopy = () => {
        navigator.clipboard.writeText(fullScanUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2200)
    }

    const handleDownloadQr = async () => {
        try {
            const res = await fetch(qrImageUrl)
            const blob = await res.blob()
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = `QR_${activeBoxId}.png`
            link.click()
            URL.revokeObjectURL(link.href)
        } catch {
            window.open(qrImageUrl, '_blank')
        }
    }

    const handlePrintQr = () => {
        window.print()
    }

    // Admin Action: Re-issue QR for current box
    const handleReissueQr = async () => {
        if (!isAdmin) return
        setIsGenerating(true)
        setGenerateNotice('')
        setErrorMsg('')
        try {
            const res = await boxApi.generateBoxQr(activeBoxId)
            setGenerateNotice(
                `Cấp phát mã QR mới cho "${activeBoxId}" thành công vào lúc ${new Date().toLocaleTimeString('vi-VN')}!`
            )
        } catch (err) {
            setErrorMsg(err.response?.data?.message || err.message || 'Không thể cấp phát lại mã QR.')
        } finally {
            setIsGenerating(false)
        }
    }

    // Admin Action: Create New Box & Generate QR
    const handleCreateBoxSubmit = async (e) => {
        e.preventDefault()
        if (!newBoxForm.boxId.trim()) {
            setErrorMsg('Vui lòng nhập mã tủ khóa (boxId).')
            return
        }
        setCreatingBox(true)
        setErrorMsg('')
        try {
            await boxApi.createBox({
                boxId: newBoxForm.boxId.trim(),
                name: newBoxForm.name.trim() || undefined,
                address: newBoxForm.address.trim() || undefined,
            })
            setGenerateNotice(`Đã tạo tủ khóa "${newBoxForm.boxId}" và cấp phát mã QR thành công!`)
            setSelectedBoxId(newBoxForm.boxId.trim())
            setCustomBoxId('')
            setShowCreateModal(false)
            setNewBoxForm({ boxId: '', name: '', address: '' })
            await loadAdminBoxes()
        } catch (err) {
            setErrorMsg(err.response?.data?.message || err.message || 'Lỗi khi tạo tủ khóa.')
        } finally {
            setCreatingBox(false)
        }
    }

    const activeBoxMeta =
        PRESET_BOXES.find((b) => b.id.toLowerCase() === activeBoxId.toLowerCase()) ||
        dbBoxes.find((b) => (b.boxId || '').toLowerCase() === activeBoxId.toLowerCase())

    // -------------------------------------------------------------
    // NON-ADMIN VIEW: Strictly display access restriction message
    // -------------------------------------------------------------
    if (!isAdmin) {
        return (
            <div className="max-w-3xl mx-auto py-12 px-4 space-y-6">
                <div className="rounded-3xl border border-red-500/30 bg-gradient-to-b from-red-950/40 to-slate-900/90 p-8 sm:p-10 shadow-2xl backdrop-blur-xl text-center space-y-6">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-red-500/15 border-2 border-red-500/40 flex items-center justify-center text-red-400 shadow-xl shadow-red-500/10">
                        <ShieldAlert className="w-10 h-10 animate-pulse" />
                    </div>

                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold uppercase tracking-wider">
                            <Lock className="w-3.5 h-3.5" />
                            Phân quyền truy cập bị hạn chế (403 Forbidden)
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                            Chỉ Quản trị viên (Admin) mới có quyền tạo và cấp phát mã QR cho tủ khóa.
                        </h1>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-red-500/20 text-xs text-slate-300 max-w-xl mx-auto leading-relaxed space-y-2">
                        <p>
                            Bạn hiện đang đăng nhập với vai trò:{' '}
                            <span className="font-bold text-amber-400 uppercase tracking-wide">
                                {userRole || 'Khách vãng lai'}
                            </span>
                            .
                        </p>
                        <p className="text-slate-400">
                            Theo quy định an toàn hệ sinh thái Lockship, toàn bộ các chức năng:{' '}
                            <strong className="text-white">Tạo mã QR</strong>,{' '}
                            <strong className="text-white">In mã QR</strong>, và{' '}
                            <strong className="text-white">Cấp phát QR mới cho Box</strong>{' '}
                            được bảo vệ tuyệt đối và chỉ có tài khoản Quản trị viên (Admin) mới có quyền thực thi.
                        </p>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                        <Link
                            to={userRole === 'owner' ? '/owner/dashboard' : userRole === 'shipper' ? '/shipper/dashboard' : '/dashboard'}
                            className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 shadow-lg inline-flex items-center gap-2 transition-all active:scale-95"
                        >
                            <ArrowRight className="w-4 h-4 rotate-180" />
                            <span>Quay lại Bảng điều khiển</span>
                        </Link>
                        {!isAuthenticated && (
                            <Link
                                to="/login"
                                className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 inline-flex items-center gap-2 transition-all active:scale-95"
                            >
                                <span>Đăng nhập tài khoản Admin</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // -------------------------------------------------------------
    // ADMIN VIEW: Full Administrative Capabilities
    // -------------------------------------------------------------
    return (
        <div className="space-y-6 max-w-6xl mx-auto py-2">
            {/* Header Title Banner with Admin Verification */}
            <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/70 border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 left-1/3 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold tracking-wide uppercase">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Khu vực Quản trị viên (Admin Security Authorized)
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="p-2 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                <QrCode className="w-7 h-7" />
                            </span>
                            Cấp Phát & Quản Lý Mã QR Box
                        </h1>
                        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                            Chỉ Quản trị viên (Admin) mới có quyền tạo và cấp phát mã QR cho tủ khóa.
                            Sử dụng công cụ này để tạo mã định danh, in tem dán lên thân tủ và kiểm thử quy trình mở tủ của Shipper vãng lai.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        {/* ADMIN BUTTON 1: Tạo mã QR */}
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 inline-flex items-center gap-1.5 transition-all active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Tạo mã QR</span>
                        </button>

                        {/* ADMIN BUTTON 2: In mã QR */}
                        <button
                            type="button"
                            onClick={handlePrintQr}
                            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 inline-flex items-center gap-1.5 transition-all active:scale-95"
                        >
                            <Printer className="w-4 h-4 text-cyan-400" />
                            <span>In mã QR</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Notifications and Alerts */}
            {generateNotice && (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{generateNotice}</span>
                    </div>
                    <button
                        onClick={() => setGenerateNotice('')}
                        className="text-emerald-400 hover:text-white text-xs px-2 py-0.5 rounded"
                    >
                        ✕
                    </button>
                </div>
            )}

            {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-semibold flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                    <button
                        onClick={() => setErrorMsg('')}
                        className="text-rose-400 hover:text-white text-xs px-2 py-0.5 rounded"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Grid 2 Columns: Controls on Left, QR Showcase on Right */}
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                {/* LEFT: Configuration Controls */}
                <div className="space-y-6">
                    {/* 1. Environment Selection Card */}
                    <Card
                        title="1. Chọn Môi Trường & Tên Miền Đích"
                        description="Mã QR sẽ tự động sinh liên kết dựa trên môi trường bạn chọn"
                    >
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setEnvMode('production')}
                                    className={`p-3 rounded-2xl border text-left transition-all ${
                                        envMode === 'production'
                                            ? 'border-cyan-400/80 bg-cyan-500/15 shadow-lg shadow-cyan-500/15'
                                            : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <Globe
                                            className={`w-4 h-4 ${envMode === 'production' ? 'text-cyan-400' : 'text-slate-400'}`}
                                        />
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase">
                                            Khuyên dùng
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-white">Vercel Production</p>
                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">lockship-gamma.vercel.app</p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setEnvMode('auto')}
                                    className={`p-3 rounded-2xl border text-left transition-all ${
                                        envMode === 'auto'
                                            ? 'border-cyan-400/80 bg-cyan-500/15 shadow-lg shadow-cyan-500/15'
                                            : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <Laptop
                                            className={`w-4 h-4 ${envMode === 'auto' ? 'text-cyan-400' : 'text-slate-400'}`}
                                        />
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 uppercase">
                                            Hiện tại
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-white">Tự động (Origin)</p>
                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                        {typeof window !== 'undefined' ? window.location.host : 'localhost'}
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setEnvMode('custom')}
                                    className={`p-3 rounded-2xl border text-left transition-all ${
                                        envMode === 'custom'
                                            ? 'border-cyan-400/80 bg-cyan-500/15 shadow-lg shadow-cyan-500/15'
                                            : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <Zap
                                            className={`w-4 h-4 ${envMode === 'custom' ? 'text-cyan-400' : 'text-slate-400'}`}
                                        />
                                    </div>
                                    <p className="text-xs font-bold text-white">Tùy chỉnh (LAN/IP)</p>
                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">Ngrok / Cloud / LAN</p>
                                </button>
                            </div>

                            {envMode === 'custom' && (
                                <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-700">
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Nhập địa chỉ Web tùy chỉnh (kèm http:// hoặc https://):
                                    </label>
                                    <input
                                        type="url"
                                        placeholder="Ví dụ: http://192.168.3.244:5173"
                                        value={customHost}
                                        onChange={(e) => setCustomHost(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                    />
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* 2. Box Selection Card */}
                    <Card
                        title="2. Chọn Tủ Khóa Cần Quản Lý QR"
                        description="Chọn tủ khóa có sẵn trên hệ thống hoặc nhập mã Box ID để cấp phát"
                        action={
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Thêm Box mới</span>
                            </button>
                        }
                    >
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {PRESET_BOXES.map((b) => (
                                    <button
                                        key={b.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedBoxId(b.id)
                                            setCustomBoxId('')
                                        }}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            selectedBoxId === b.id && !customBoxId
                                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 scale-[1.02]'
                                                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80'
                                        }`}
                                    >
                                        <Box className="w-3.5 h-3.5" />
                                        <span>{b.id}</span>
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${
                                                b.status === 'online' ? 'bg-emerald-400' : 'bg-slate-500'
                                            }`}
                                        />
                                    </button>
                                ))}
                            </div>

                            {/* Custom Box ID Input */}
                            <div className="pt-2">
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Hoặc chọn mã định danh Box khác:
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: LOCKSHIP-BOX-999, BOX-01..."
                                    value={customBoxId}
                                    onChange={(e) => setCustomBoxId(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                                />
                            </div>

                            {/* Active Box Meta Info */}
                            {activeBoxMeta && (
                                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-1">
                                    <div className="flex items-center justify-between text-slate-300">
                                        <span className="font-bold text-white">{activeBoxMeta.name}</span>
                                        {activeBoxMeta.battery != null && (
                                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                Pin: {activeBoxMeta.battery}%
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-400">{activeBoxMeta.address}</p>
                                </div>
                            )}

                            {/* ADMIN BUTTON 3: Cấp phát QR mới cho Box */}
                            <div className="pt-2">
                                <button
                                    type="button"
                                    disabled={isGenerating}
                                    onClick={handleReissueQr}
                                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md inline-flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                                    <span>{isGenerating ? 'Đang cấp phát...' : 'Cấp phát QR mới cho Box'}</span>
                                </button>
                            </div>
                        </div>
                    </Card>

                    {/* 3. Testing Playbook Guide */}
                    <div className="rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-500/20 p-5 space-y-3">
                        <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
                            <Info className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
                            <span>Quy trình 4 bước kiểm thử thực tế trên điện thoại:</span>
                        </div>
                        <ol className="list-decimal pl-4 space-y-2 text-xs text-slate-300 leading-relaxed">
                            <li>
                                <strong>Bật Camera / Zalo trên điện thoại:</strong> Quét hình ảnh mã QR bên cạnh màn hình máy tính này.
                            </li>
                            <li>
                                <strong>Điền Form Shipper vãng lai:</strong> Nhập số điện thoại, chọn nguồn hàng (Shopee, Lazada...) $\rightarrow$ bấm <em>"Gửi yêu cầu mở tủ"</em>.
                            </li>
                            <li>
                                <strong>Chủ tủ (Owner) nhận thông báo:</strong> Trên Owner Dashboard phát chuông báo $\rightarrow$ Owner bấm <em>"Xác thực & Mở tủ"</em>.
                            </li>
                            <li>
                                <strong>Nhận mã PIN tức thì:</strong> Màn hình điện thoại Shipper tự động hiển thị to <strong>Mã PIN 6 số</strong> mà không cần đăng nhập hay tải lại trang.
                            </li>
                        </ol>
                    </div>
                </div>

                {/* RIGHT: High-Res Interactive QR Code Canvas & Print Placard */}
                <div className="space-y-6">
                    <SpatialTiltCard className="rounded-3xl" maxTilt={5}>
                        <div className="rounded-3xl bg-slate-900/90 border border-cyan-500/40 p-6 sm:p-7 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold mb-3 border border-cyan-500/25">
                                <QrCode className="w-3.5 h-3.5" />
                                MÃ QR ĐỊNH DANH HỢP CHUẨN
                            </div>

                            <h2 className="text-xl font-bold text-white mb-1">{activeBoxId.toUpperCase()}</h2>
                            <p className="text-xs text-slate-400 mb-5">
                                Quản trị viên đã cấp phát mã QR chính thức cho tủ khóa này
                            </p>

                            {/* High-Res QR Card Frame (Print Target) */}
                            <div
                                id="printable-qr-card"
                                className="p-4 sm:p-5 rounded-2xl bg-white mx-auto w-fit shadow-2xl border-4 border-cyan-500/40 transition-transform duration-300 hover:scale-[1.02]"
                            >
                                <img
                                    src={qrImageUrl}
                                    alt={`QR for ${activeBoxId}`}
                                    className="w-56 h-56 sm:w-64 sm:h-64 block mx-auto object-contain"
                                />
                                <div className="mt-2 text-center">
                                    <p className="text-xs font-black text-slate-900 tracking-wider">
                                        {activeBoxId.toUpperCase()}
                                    </p>
                                    <p className="text-[10px] text-slate-600 font-mono">LOCKSHIP SMART LOCKER</p>
                                </div>
                            </div>

                            {/* Full URL Box */}
                            <div className="mt-5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-left">
                                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                                    <span>Đường dẫn đích (Target URL):</span>
                                    <span className="text-emerald-400 font-mono text-[10px]">Ready to scan</span>
                                </div>
                                <p className="font-mono text-xs text-cyan-300 break-all select-all font-semibold">
                                    {fullScanUrl}
                                </p>
                            </div>

                            {/* Action Buttons: Download, Copy, Print */}
                            <div className="mt-4 grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4 text-emerald-400" />
                                            <span className="text-emerald-400">Đã sao chép!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            <span>Sao chép Link</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDownloadQr}
                                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md"
                                >
                                    <Download className="w-4 h-4 text-cyan-400" />
                                    <span>Tải ảnh QR (PNG)</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handlePrintQr}
                                    className="col-span-2 py-3 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-xs border border-cyan-500/40 inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    <Printer className="w-4 h-4 text-cyan-300" />
                                    <span>In Tem Mã QR Dán Tủ (Print Label)</span>
                                </button>

                                <a
                                    href={fullScanUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="col-span-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-cyan-500/25 inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span>Mở thử trang Shipper vãng lai (Tab mới)</span>
                                </a>
                            </div>
                        </div>
                    </SpatialTiltCard>
                </div>
            </div>

            {/* MODAL: Tạo mã QR & Box mới (Admin Only) */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl relative">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                            <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
                                <Plus className="w-5 h-5" />
                                <span>Tạo Mã QR & Tủ Khóa Mới</span>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-slate-400 hover:text-white text-sm p-1 rounded-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateBoxSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Mã Tủ Khóa (Box ID) <span className="text-rose-400">*</span>:
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: LOCKSHIP-BOX-010"
                                    value={newBoxForm.boxId}
                                    onChange={(e) => setNewBoxForm({ ...newBoxForm, boxId: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white uppercase focus:outline-none focus:border-cyan-500 font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Tên Tủ Khóa (Tùy chọn):
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Tủ #010 (Bến Xe Trung Tâm)"
                                    value={newBoxForm.name}
                                    onChange={(e) => setNewBoxForm({ ...newBoxForm, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Vị trí lắp đặt / Địa chỉ (Tùy chọn):
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Số 123 Đường 30 Tháng 4, Cần Thơ"
                                    value={newBoxForm.address}
                                    onChange={(e) => setNewBoxForm({ ...newBoxForm, address: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <p className="text-[11px] text-slate-400">
                                Hệ thống sẽ cấp phát ngay lập tức mã QR chuẩn cho Tủ khóa mới và sẵn sàng để in ấn.
                            </p>

                            <div className="pt-2 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingBox}
                                    className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5"
                                >
                                    {creatingBox ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>Đang tạo...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Tạo & Cấp phát QR</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
