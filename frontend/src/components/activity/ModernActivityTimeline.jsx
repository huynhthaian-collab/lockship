import { useState, useMemo } from 'react'
import {
    Unlock,
    Lock,
    Package,
    Truck,
    Shield,
    ShieldAlert,
    ShieldCheck,
    AlertTriangle,
    KeyRound,
    Cpu,
    Radio,
    WifiOff,
    CheckCircle2,
    XCircle,
    Info,
    ChevronDown,
    ChevronUp,
    Copy,
    Check,
    Search,
    X,
    Filter,
    Clock,
    User
} from 'lucide-react'
import { getLogCategoryMeta, formatActivityLog } from '../../utils/activityLogFormatter.js'

function renderEventIcon(iconType) {
    switch (iconType) {
        case 'unlock':
            return <Unlock className="h-4 w-4 text-emerald-400" />
        case 'lock':
            return <Lock className="h-4 w-4 text-emerald-400" />
        case 'package':
            return <Package className="h-4 w-4 text-blue-400" />
        case 'truck':
            return <Truck className="h-4 w-4 text-blue-400" />
        case 'key':
            return <KeyRound className="h-4 w-4 text-emerald-400" />
        case 'cpu':
            return <Cpu className="h-4 w-4 text-emerald-400" />
        case 'shield-check':
            return <ShieldCheck className="h-4 w-4 text-emerald-400" />
        case 'shield-alert':
            return <ShieldAlert className="h-4 w-4 text-rose-400" />
        case 'alert':
            return <AlertTriangle className="h-4 w-4 text-amber-400" />
        case 'wifi-off':
            return <WifiOff className="h-4 w-4 text-rose-400" />
        case 'radio':
            return <Radio className="h-4 w-4 text-purple-400" />
        case 'check':
            return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        case 'cancel':
            return <XCircle className="h-4 w-4 text-rose-400" />
        default:
            return <Info className="h-4 w-4 text-slate-400" />
    }
}

export default function ModernActivityTimeline({
    logs = [],
    isLoading = false,
    emptyMessage = 'Không có nhật ký nào trong phân mục này',
    emptyDescription = 'Hãy thử chuyển tab bộ lọc hoặc xóa từ khóa tìm kiếm để xem các sự kiện khác.'
}) {
    const [activeTab, setActiveTab] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedLogId, setExpandedLogId] = useState(null)
    const [copiedId, setCopiedId] = useState(null)

    // Normalize logs: format if raw
    const normalizedLogs = useMemo(() => {
        return (logs || []).map((log) => {
            if (log.eventTitle && log.message && log.relativeTime) {
                return log
            }
            return formatActivityLog(log)
        })
    }, [logs])

    // Category counts
    const counts = useMemo(() => {
        const res = { all: normalizedLogs.length, unlock: 0, order: 0, auth: 0, alert: 0 }
        for (const log of normalizedLogs) {
            if (log.category === 'unlock') res.unlock++
            else if (log.category === 'order') res.order++
            else if (log.category === 'auth') res.auth++
            else if (log.category === 'warning' || log.category === 'error' || log.category === 'alert') res.alert++
        }
        return res
    }, [normalizedLogs])

    // Filter and search
    const filteredLogs = useMemo(() => {
        return normalizedLogs.filter((log) => {
            // Tab filter
            if (activeTab === 'unlock' && log.category !== 'unlock') return false
            if (activeTab === 'order' && log.category !== 'order') return false
            if (activeTab === 'auth' && log.category !== 'auth') return false
            if (activeTab === 'alert' && !['warning', 'error', 'alert'].includes(log.category)) return false

            // Search filter
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase()
                const matchMsg = (log.message || '').toLowerCase().includes(term)
                const matchActor = (log.actorName || '').toLowerCase().includes(term)
                const matchDevice = (log.deviceName || '').toLowerCase().includes(term)
                const matchDelivery = (log.deliveryCode || '').toLowerCase().includes(term)
                const matchTitle = (log.eventTitle || '').toLowerCase().includes(term)
                if (!matchMsg && !matchActor && !matchDevice && !matchDelivery && !matchTitle) return false
            }
            return true
        })
    }, [normalizedLogs, activeTab, searchTerm])

    const copyPayload = (id, payload) => {
        navigator.clipboard?.writeText(JSON.stringify(payload, null, 2))
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    return (
        <div className="space-y-4">
            {/* Header Toolbar: Quick Filter Tabs + Search */}
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3.5 backdrop-blur-xl md:flex-row md:items-center md:justify-between shadow-xl">
                {/* 5 Quick Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    {[
                        { key: 'all', label: 'Tất cả', count: counts.all, color: 'text-slate-200' },
                        { key: 'unlock', label: '🟢 Đóng/Mở khóa', count: counts.unlock, color: 'text-emerald-300' },
                        { key: 'order', label: '🔵 Đơn hàng', count: counts.order, color: 'text-blue-300' },
                        { key: 'auth', label: '🟣 Tài khoản & Bảo mật', count: counts.auth, color: 'text-purple-300' },
                        { key: 'alert', label: '🟡 Cảnh báo & Lỗi', count: counts.alert, color: 'text-amber-300' },
                    ].map((tab) => {
                        const active = activeTab === tab.key
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                                    active
                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-950/40 ring-1 ring-purple-400/40'
                                        : 'border border-white/5 bg-white/[0.03] text-slate-400 hover:bg-white/10 hover:text-white'
                                }`}
                                type="button"
                            >
                                <span>{tab.label}</span>
                                <span
                                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                                        active ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'
                                    }`}
                                >
                                    {tab.count}
                                </span>
                            </button>
                        )
                    })}
                </div>

                {/* Search Bar */}
                <div className="relative min-w-[240px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none"
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm theo tên người, trạm Box, đơn hàng..."
                        value={searchTerm}
                    />
                    {searchTerm && (
                        <button
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            onClick={() => setSearchTerm('')}
                            type="button"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Timeline Stream */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="flex items-center gap-3 text-sm text-cyan-400 font-semibold animate-pulse">
                        <Radio className="h-5 w-5 animate-spin" />
                        Đang đồng bộ luồng nhật ký thời gian thực...
                    </div>
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-12 text-center">
                    <Clock className="mx-auto h-9 w-9 text-slate-600 mb-2.5" />
                    <p className="text-sm font-bold text-slate-300">{emptyMessage}</p>
                    <p className="text-xs text-slate-500 mt-1">
                        {emptyDescription}
                    </p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {filteredLogs.map((log) => {
                        const meta = getLogCategoryMeta(log.category)
                        const isExpanded = expandedLogId === log.id

                        return (
                            <div
                                key={log.id}
                                className={`group rounded-2xl border border-white/10 bg-slate-900/40 p-3.5 backdrop-blur-xl transition hover:border-white/20 hover:bg-slate-900/70 shadow-lg ${meta.borderLeft} border-l-[3px]`}
                            >
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    {/* 1. Icon + Loại sự kiện */}
                                    <div className="flex items-start gap-3 md:items-center min-w-[190px] shrink-0">
                                        <div
                                            className={`flex h-8 w-8 items-center justify-center rounded-xl border ${meta.badgeClass}`}
                                        >
                                            {renderEventIcon(log.iconType)}
                                        </div>
                                        <div>
                                            <span
                                                className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${meta.badgeClass}`}
                                            >
                                                {log.eventTitle}
                                            </span>
                                            <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate max-w-[150px]">
                                                {log.deviceName}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 2. Nội dung tự nhiên, dễ đọc cho người dùng */}
                                    <div className="flex-1 pr-2">
                                        <p className="text-xs font-medium text-slate-100 leading-relaxed">
                                            {log.message}
                                        </p>
                                    </div>

                                    {/* 3. Người thực hiện + Vai trò */}
                                    <div className="flex items-center gap-2 min-w-[160px] shrink-0">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
                                            <User className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-semibold text-white truncate max-w-[120px]">
                                                {log.actorName}
                                            </p>
                                            <span className="text-[10px] text-slate-400">
                                                {log.actorRole}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 4. Thời gian thông minh + Nút xem chi tiết */}
                                    <div className="flex items-center justify-between gap-3 min-w-[140px] shrink-0 md:justify-end">
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-cyan-300">
                                                {log.relativeTime}
                                            </p>
                                            <p className="text-[10px] font-mono text-slate-500">
                                                {log.absoluteTime}
                                            </p>
                                        </div>

                                        <button
                                            className={`rounded-xl border border-white/10 px-2.5 py-1.5 text-[11px] font-bold transition ${
                                                isExpanded
                                                    ? 'bg-purple-600 text-white'
                                                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                                            }`}
                                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                            type="button"
                                            title="Xem chi tiết kỹ thuật MQTT / JSON"
                                        >
                                            {isExpanded ? (
                                                <ChevronUp className="h-3.5 w-3.5" />
                                            ) : (
                                                <ChevronDown className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Expandable Drawer: MQTT Topic & Raw JSON Payload */}
                                {isExpanded && (
                                    <div className="mt-3.5 border-t border-white/10 pt-3 text-xs animate-in fade-in duration-200">
                                        <div className="flex items-center justify-between pb-2 text-[11px] text-slate-400 font-mono">
                                            <span>
                                                Chủ đề (MQTT Topic): <strong className="text-purple-300">{log.topic}</strong>
                                            </span>
                                            <button
                                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 hover:bg-white/10 transition"
                                                onClick={() => copyPayload(log.id, log.rawPayload)}
                                                type="button"
                                            >
                                                {copiedId === log.id ? (
                                                    <>
                                                        <Check className="h-3 w-3 text-emerald-400" />
                                                        Đã sao chép
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-3 w-3" />
                                                        Sao chép JSON
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        <pre className="max-h-48 overflow-auto rounded-xl border border-white/10 bg-slate-950/80 p-3 font-mono text-[11px] text-emerald-300 leading-relaxed">
                                            {JSON.stringify(log.rawPayload, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
