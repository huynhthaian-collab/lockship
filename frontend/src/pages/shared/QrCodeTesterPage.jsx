import React, { useState, useEffect } from 'react'
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
    Box,
    CheckCircle2,
    ArrowRight,
    RefreshCw,
    Share2,
    Info,
    Laptop,
    Radio,
    Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import SpatialTiltCard from '../../components/spatial/SpatialTiltCard.jsx'

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
    // Environment selector: 'production' | 'auto' | 'custom'
    const [envMode, setEnvMode] = useState('production')
    const [selectedBoxId, setSelectedBoxId] = useState('LOCKSHIP-BOX-001')
    const [customBoxId, setCustomBoxId] = useState('')
    const [customHost, setCustomHost] = useState('')
    const [copied, setCopied] = useState(false)
    const [qrSize, setQrSize] = useState(260)

    const activeBoxId = customBoxId.trim() || selectedBoxId

    // Compute Base Domain URL
    const getBaseUrl = () => {
        if (envMode === 'production') {
            return 'https://lockship-gamma.vercel.app'
        }
        if (envMode === 'custom' && customHost.trim()) {
            return customHost.trim().replace(/\/$/, '')
        }
        // Auto: current window origin
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

    const activeBoxMeta = PRESET_BOXES.find(
        (b) => b.id.toLowerCase() === activeBoxId.toLowerCase()
    )

    return (
        <div className="space-y-6 max-w-6xl mx-auto py-2">
            {/* Header Title Banner */}
            <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/70 border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 left-1/3 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-bold tracking-wide uppercase">
                            <Sparkles className="w-3.5 h-3.5" />
                            Tiện ích kiểm thử di động (Mobile QR Testing Studio)
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="p-2 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                <QrCode className="w-7 h-7" />
                            </span>
                            Công Cụ Tạo & Test Mã QR Box
                        </h1>
                        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                            Tạo tức thì mã QR định danh cho từng Tủ khóa Lockship trỏ tới bản Publish trên Production (Vercel) hoặc Localhost.
                            Dùng điện thoại quét mã để đóng vai <strong>Shipper vãng lai không cần đăng nhập</strong>.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Link
                            to="/owner/dashboard"
                            className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700/80 transition-all inline-flex items-center gap-1.5"
                        >
                            <Laptop className="w-4 h-4 text-cyan-400" />
                            <span>Mở Owner Dashboard</span>
                        </Link>
                    </div>
                </div>
            </div>

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
                                        <Globe className={`w-4 h-4 ${envMode === 'production' ? 'text-cyan-400' : 'text-slate-400'}`} />
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
                                        <Laptop className={`w-4 h-4 ${envMode === 'auto' ? 'text-cyan-400' : 'text-slate-400'}`} />
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 uppercase">
                                            Hiện tại
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-white">Tự động (Current Origin)</p>
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
                                        <Zap className={`w-4 h-4 ${envMode === 'custom' ? 'text-cyan-400' : 'text-slate-400'}`} />
                                    </div>
                                    <p className="text-xs font-bold text-white">Tùy chỉnh (Custom)</p>
                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">IP LAN / Ngrok / Cloud</p>
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
                        title="2. Chọn Tủ Khóa (Box ID)"
                        description="Chọn nhanh từ danh sách thiết bị thực tế hoặc nhập mã tủ tùy ý"
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
                                        <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'online' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                                    </button>
                                ))}
                            </div>

                            {/* Custom Box ID Input */}
                            <div className="pt-2">
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Hoặc nhập mã Box ID khác:
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
                                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Pin: {activeBoxMeta.battery}%
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400">{activeBoxMeta.address}</p>
                                </div>
                            )}
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

                {/* RIGHT: High-Res Interactive QR Code Canvas */}
                <div className="space-y-6">
                    <SpatialTiltCard className="rounded-3xl" maxTilt={5}>
                        <div className="rounded-3xl bg-slate-900/90 border border-cyan-500/40 p-6 sm:p-7 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold mb-3 border border-cyan-500/25">
                                <QrCode className="w-3.5 h-3.5" />
                                MÃ QR KIỂM THỬ THỰC TẾ
                            </div>

                            <h2 className="text-xl font-bold text-white mb-1">
                                {activeBoxId.toUpperCase()}
                            </h2>
                            <p className="text-xs text-slate-400 mb-5">
                                Hướng camera điện thoại vào khung hình vuông bên dưới
                            </p>

                            {/* High-Res QR Card Frame */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-white mx-auto w-fit shadow-2xl border-4 border-cyan-500/40 transition-transform duration-300 hover:scale-[1.02]">
                                <img
                                    src={qrImageUrl}
                                    alt={`QR for ${activeBoxId}`}
                                    className="w-56 h-56 sm:w-64 sm:h-64 block mx-auto object-contain"
                                />
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

                            {/* Action Buttons */}
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
        </div>
    )
}
