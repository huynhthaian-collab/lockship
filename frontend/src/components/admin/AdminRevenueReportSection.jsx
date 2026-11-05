import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    Activity,
    AlertCircle,
    ArrowUpRight,
    Award,
    BarChart3,
    Check,
    CheckCircle2,
    Clock,
    DollarSign,
    Download,
    Eye,
    Filter,
    HelpCircle,
    Package,
    RefreshCw,
    Search,
    ShieldCheck,
    Smartphone,
    TrendingUp,
    User,
    Users,
    Wallet,
} from 'lucide-react'
import Card from '../ui/Card.jsx'
import Modal from '../ui/Modal.jsx'
import SpatialTiltCard from '../spatial/SpatialTiltCard.jsx'
import { adminInvoiceApi } from '../../services/adminApi.js'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'

function formatMoney(amount) {
    return Number(amount || 0).toLocaleString('vi-VN') + ' đ'
}

function formatDate(value) {
    if (!value) return '—'
    const d = new Date(value)
    return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
}

export default function AdminRevenueReportSection({ onActionCompleted }) {
    const [selectedMonth, setSelectedMonth] = useState('2026-10')
    const [invoices, setInvoices] = useState([])
    const [summary, setSummary] = useState({
        totalRevenue: 0,
        totalPaid: 0,
        totalPending: 0,
        totalUnpaid: 0,
        countPaid: 0,
        countPending: 0,
        countUnpaid: 0,
    })
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')

    // Modals
    const [selectedInvoiceForHistory, setSelectedInvoiceForHistory] = useState(null)
    const [verifyingInvoice, setVerifyingInvoice] = useState(null)
    const [adminNote, setAdminNote] = useState('')
    const [submittingVerify, setSubmittingVerify] = useState(false)

    // Tooltip for daily chart
    const [hoveredDay, setHoveredDay] = useState(null)

    const loadReportData = useCallback(
        async (silent = false) => {
            if (!silent) setLoading(true)
            setRefreshing(true)
            setError('')
            try {
                const data = await adminInvoiceApi.listInvoices({
                    month: selectedMonth,
                    status: 'ALL',
                })
                setInvoices(data.invoices || [])
                if (data.summary) {
                    setSummary(data.summary)
                }
            } catch (err) {
                setError(err.message || 'Không thể tải dữ liệu báo cáo doanh thu.')
            } finally {
                setLoading(false)
                setRefreshing(false)
            }
        },
        [selectedMonth]
    )

    useEffect(() => {
        loadReportData()
    }, [loadReportData])

    // Real-time socket listeners
    const onLiveBillingUpdate = useCallback(() => {
        loadReportData(true)
    }, [loadReportData])

    useSocketEvent('admin:invoice_pending', onLiveBillingUpdate)
    useSocketEvent('billing:usage_recorded', onLiveBillingUpdate)
    useSocketEvent('billing:payment_verified', onLiveBillingUpdate)

    // Calculate total usages across invoices
    const totalUsagesCount = useMemo(() => {
        return invoices.reduce((acc, inv) => acc + (inv.totalUsages || 0), 0)
    }, [invoices])

    // Daily usages distribution (Day 1 to 31)
    const dailyStats = useMemo(() => {
        const days = Array.from({ length: 31 }, (_, i) => ({
            day: i + 1,
            count: 0,
            revenue: 0,
            usages: [],
        }))

        invoices.forEach((inv) => {
            const history = inv.usageHistory || []
            history.forEach((u) => {
                if (u.usedAt) {
                    const d = new Date(u.usedAt)
                    const dayNum = d.getDate()
                    if (dayNum >= 1 && dayNum <= 31) {
                        days[dayNum - 1].count += 1
                        days[dayNum - 1].revenue += u.cost || 5000
                        days[dayNum - 1].usages.push({
                            ...u,
                            ownerName: inv.ownerId?.name || 'Chủ tủ',
                        })
                    }
                }
            })
        })

        const maxCount = Math.max(...days.map((d) => d.count), 1)
        return { days, maxCount }
    }, [invoices])

    // Top 5 Owners with highest usage
    const topOwners = useMemo(() => {
        const sorted = [...invoices].sort((a, b) => (b.totalUsages || 0) - (a.totalUsages || 0))
        return sorted.slice(0, 5)
    }, [invoices])

    // Filtered invoices for detailed reconciliation table
    const filteredInvoices = useMemo(() => {
        return invoices.filter((inv) => {
            if (statusFilter !== 'ALL' && inv.paymentStatus !== statusFilter) {
                return false
            }
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase()
                const name = (inv.ownerId?.name || '').toLowerCase()
                const phone = (inv.ownerId?.phone || '').toLowerCase()
                const syntax = (inv.transferSyntax || '').toLowerCase()
                const boxCode = (inv.usageHistory?.[0]?.boxId || '').toLowerCase()
                const boxAddress = (inv.usageHistory?.[0]?.boxAddress || '').toLowerCase()
                return (
                    name.includes(q) ||
                    phone.includes(q) ||
                    syntax.includes(q) ||
                    boxCode.includes(q) ||
                    boxAddress.includes(q)
                )
            }
            return true
        })
    }, [invoices, statusFilter, searchTerm])

    // Handle CSV Export with UTF-8 BOM
    const handleExportCsv = () => {
        const bom = '\uFEFF'
        const headers = [
            'STT',
            'Tên Chủ Sở Hữu (Owner)',
            'Số Điện Thoại',
            'Email',
            'Mã Tủ Khóa (Box Code)',
            'Tên Trạm Tủ Khóa',
            'Địa Chỉ Lắp Đặt',
            'Kỳ Cước Hạch Toán',
            'Số Lượt Sử Dụng',
            'Đơn Giá (VNĐ)',
            'Tổng Tiền Cước (VNĐ)',
            'Cú Pháp Chuyển Khoản',
            'Trạng Thái Thanh Toán',
            'Thời Gian Thanh Toán',
            'Ghi Chú / Bằng Chứng Đối Soát',
        ]

        const rows = invoices.map((inv, index) => {
            const firstUsage = inv.usageHistory?.[0]
            const boxCode = firstUsage?.boxId || `BOX-${String(index + 1).padStart(2, '0')}`
            const boxName = firstUsage?.boxName || `Lockship Box #${boxCode}`
            const address = firstUsage?.boxAddress || inv.ownerId?.address || 'Cần Thơ'
            const statusLabel =
                inv.paymentStatus === 'PAID'
                    ? 'Đã thanh toán (PAID)'
                    : inv.paymentStatus === 'PENDING_VERIFICATION'
                    ? 'Chờ đối soát (PENDING)'
                    : 'Chưa thanh toán (UNPAID)'

            return [
                index + 1,
                `"${inv.ownerId?.name || 'Chủ tủ'}"`,
                `"${inv.ownerId?.phone || '—'}"`,
                `"${inv.ownerId?.email || '—'}"`,
                `"${boxCode}"`,
                `"${boxName}"`,
                `"${address.replace(/"/g, '""')}"`,
                `"${inv.month || selectedMonth}"`,
                inv.totalUsages || 0,
                inv.unitPrice || 5000,
                inv.totalAmount || 0,
                `"${inv.transferSyntax || '—'}"`,
                `"${statusLabel}"`,
                `"${inv.paidAt ? formatDate(inv.paidAt) : '—'}"`,
                `"${(inv.paymentProofNote || '').replace(/"/g, '""')}"`,
            ].join(',')
        })

        const csvContent = bom + [headers.join(','), ...rows].join('\r\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `Bao_Cao_Doanh_Thu_Lockship_Thang_${selectedMonth.replace('-', '_')}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    // Verify payment submission
    const handleConfirmVerify = async () => {
        if (!verifyingInvoice) return
        setSubmittingVerify(true)
        setError('')
        try {
            await adminInvoiceApi.verifyPayment(verifyingInvoice._id, { note: adminNote })
            setSuccessMessage(`Đã xác nhận thanh toán thành công cho chủ tủ ${verifyingInvoice.ownerId?.name || 'Owner'}!`)
            setVerifyingInvoice(null)
            setAdminNote('')
            loadReportData(true)
            if (onActionCompleted) onActionCompleted()
            setTimeout(() => setSuccessMessage(''), 8000)
        } catch (err) {
            setError(err.message || 'Lỗi khi xác nhận hóa đơn.')
        } finally {
            setSubmittingVerify(false)
        }
    }

    return (
        <section aria-labelledby="revenue-report-heading" className="mt-8 space-y-6">
            {/* Header with Title and Month Picker */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
                            <BarChart3 size={13} className="text-cyan-400" />
                            Phân tích Tài chính & Cước phí Trạm tủ
                        </span>
                        <span className="hidden rounded-full border border-pink-500/30 bg-pink-500/10 px-2.5 py-0.5 text-[10px] font-bold text-pink-300 sm:inline-block">
                            VietQR BIDV 24/7
                        </span>
                    </div>
                    <h2 id="revenue-report-heading" className="mt-2 text-xl font-extrabold text-white sm:text-2xl">
                        📊 Báo cáo Doanh thu & Cước phí
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                        Thống kê cước phí 5.000 VNĐ / lượt nhận hàng, phân bổ tần suất sử dụng và đối soát chuyển khoản của 15 Chủ tủ
                    </p>
                </div>

                {/* Month Picker & Actions */}
                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#12192c] px-3 py-1.5 shadow-inner">
                        <Clock size={14} className="text-cyan-400" />
                        <span className="text-xs font-semibold text-slate-300">Kỳ cước:</span>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                        >
                            <option value="2026-10" className="bg-[#12192c] text-white">Tháng 10/2026 (Kỳ chuẩn)</option>
                            <option value="2026-11" className="bg-[#12192c] text-white">Tháng 11/2026</option>
                            <option value="2026-09" className="bg-[#12192c] text-white">Tháng 09/2026</option>
                            <option value="ALL" className="bg-[#12192c] text-white">Tất cả các tháng</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={handleExportCsv}
                        disabled={invoices.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-[0_0_15px_rgba(16,185,129,0.25)] transition hover:scale-105 active:scale-95 disabled:opacity-50"
                        title="Tải về file Excel/CSV chuẩn UTF-8 tiếng Việt"
                    >
                        <Download size={14} />
                        Xuất file báo cáo (Excel/CSV)
                    </button>

                    <button
                        type="button"
                        onClick={() => loadReportData()}
                        disabled={refreshing}
                        className="ui-button-secondary gap-1 px-3 py-2 text-xs font-semibold"
                        title="Làm mới dữ liệu"
                    >
                        <RefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
                    </button>
                </div>
            </div>

            {/* Notification alerts */}
            {successMessage && (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm font-semibold text-emerald-300 animate-page-in">
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                    <span>{successMessage}</span>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* 5 KPI Summary Bento Cards */}
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
                {/* 1. Tổng doanh thu */}
                <SpatialTiltCard className="rounded-2xl" maxTilt={6}>
                    <div className="spatial-card relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-slate-950/80 p-4 shadow-[0_4px_20px_rgba(6,182,212,0.15)]">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-300">
                                Tổng Doanh Thu Cước
                            </span>
                            <span className="grid size-8 place-items-center rounded-xl border border-cyan-400/40 bg-cyan-500/20 text-cyan-300">
                                <DollarSign size={16} />
                            </span>
                        </div>
                        <p className="mt-2 font-mono text-2xl font-extrabold text-white tracking-tight">
                            {formatMoney(summary.totalRevenue)}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                            <TrendingUp size={12} className="text-emerald-400" />
                            <span>15 Owner · 5.000 đ/lượt</span>
                        </div>
                    </div>
                </SpatialTiltCard>

                {/* 2. Tổng lượt sử dụng */}
                <SpatialTiltCard className="rounded-2xl" maxTilt={6}>
                    <div className="spatial-card relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-slate-900/60 to-slate-950/80 p-4 shadow-[0_4px_20px_rgba(59,130,246,0.15)]">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-300">
                                Tổng Lượt Sử Dụng
                            </span>
                            <span className="grid size-8 place-items-center rounded-xl border border-blue-400/40 bg-blue-500/20 text-blue-300">
                                <Package size={16} />
                            </span>
                        </div>
                        <p className="mt-2 font-mono text-2xl font-extrabold text-white tracking-tight">
                            {totalUsagesCount} lượt
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                            Giao thành công & mở tủ OTP
                        </p>
                    </div>
                </SpatialTiltCard>

                {/* 3. Đã thanh toán (PAID) */}
                <SpatialTiltCard className="rounded-2xl" maxTilt={6}>
                    <div className="spatial-card relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-slate-950/80 p-4 shadow-[0_4px_20px_rgba(16,185,129,0.15)]">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                                Đã Thanh Toán (PAID)
                            </span>
                            <span className="grid size-8 place-items-center rounded-xl border border-emerald-400/40 bg-emerald-500/20 text-emerald-300">
                                <ShieldCheck size={16} />
                            </span>
                        </div>
                        <p className="mt-2 font-mono text-2xl font-extrabold text-emerald-300 tracking-tight">
                            {formatMoney(summary.totalPaid)}
                        </p>
                        <p className="mt-1 text-[11px] text-emerald-400 font-semibold">
                            {summary.countPaid} hóa đơn hoàn tất
                        </p>
                    </div>
                </SpatialTiltCard>

                {/* 4. Chờ đối soát (PENDING) */}
                <SpatialTiltCard className="rounded-2xl" maxTilt={6}>
                    <div className="spatial-card relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900/60 to-slate-950/80 p-4 shadow-[0_4px_20px_rgba(245,158,11,0.15)]">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                                Chờ Đối Soát (PENDING)
                            </span>
                            <span className="grid size-8 place-items-center rounded-xl border border-amber-400/40 bg-amber-500/20 text-amber-300">
                                <Clock size={16} />
                            </span>
                        </div>
                        <p className="mt-2 font-mono text-2xl font-extrabold text-amber-300 tracking-tight">
                            {formatMoney(summary.totalPending)}
                        </p>
                        <p className="mt-1 text-[11px] text-amber-400 font-semibold">
                            {summary.countPending} hóa đơn chờ duyệt
                        </p>
                    </div>
                </SpatialTiltCard>

                {/* 5. Chưa thanh toán (UNPAID) */}
                <SpatialTiltCard className="rounded-2xl" maxTilt={6}>
                    <div className="spatial-card relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/40 via-slate-900/60 to-slate-950/80 p-4 shadow-[0_4px_20px_rgba(244,63,94,0.15)]">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-300">
                                Chưa Thu (UNPAID)
                            </span>
                            <span className="grid size-8 place-items-center rounded-xl border border-rose-400/40 bg-rose-500/20 text-rose-300">
                                <AlertCircle size={16} />
                            </span>
                        </div>
                        <p className="mt-2 font-mono text-2xl font-extrabold text-rose-300 tracking-tight">
                            {formatMoney(summary.totalUnpaid)}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400 font-semibold">
                            {summary.countUnpaid} hóa đơn chưa đóng
                        </p>
                    </div>
                </SpatialTiltCard>
            </div>

            {/* Visual Analytics Grid: Daily Bar Chart + Top 5 Owners */}
            <div className="grid gap-6 lg:grid-cols-12">
                {/* 1. Daily Bar Chart (7 Cols) */}
                <div className="lg:col-span-7">
                    <Card
                        title="Tần suất sử dụng tủ khóa theo ngày trong tháng"
                        description="Phân bổ các lượt nhận & mở tủ thông minh (5.000 đ/lượt) xuyên suốt tháng 10/2026"
                    >
                        <div className="space-y-4">
                            {/* Chart Bar Area */}
                            <div className="relative pt-6 pb-2">
                                {/* Hover detail info pill */}
                                <div className="mb-3 flex items-center justify-between text-xs">
                                    <span className="text-slate-400">
                                        Rải đều từ ngày 01 đến 31 (chu kỳ giãn cách 3 - 6 ngày/lượt):
                                    </span>
                                    {hoveredDay ? (
                                        <span className="font-semibold text-cyan-300 animate-fade-in">
                                            Ngày {String(hoveredDay.day).padStart(2, '0')}/10: {hoveredDay.count} lượt ({formatMoney(hoveredDay.revenue)})
                                        </span>
                                    ) : (
                                        <span className="text-slate-500">Rê chuột vào cột để xem chi tiết</span>
                                    )}
                                </div>

                                {/* Bars container */}
                                <div className="flex h-44 items-end justify-between gap-1 rounded-xl border border-white/5 bg-white/[0.01] p-3 sm:gap-1.5">
                                    {dailyStats.days.map((item) => {
                                        const heightPercent =
                                            item.count > 0
                                                ? Math.max(Math.round((item.count / dailyStats.maxCount) * 100), 18)
                                                : 6
                                        const isActive = item.count > 0

                                        return (
                                            <div
                                                key={item.day}
                                                className="group relative flex flex-1 flex-col items-center justify-end h-full cursor-pointer"
                                                onMouseEnter={() => setHoveredDay(item)}
                                                onMouseLeave={() => setHoveredDay(null)}
                                            >
                                                {/* Tooltip on hover */}
                                                <div className="pointer-events-none absolute -top-12 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-cyan-400/40 bg-[#0d1424] px-2 py-1 text-[10px] font-bold text-cyan-200 shadow-xl group-hover:block left-1/2">
                                                    <div>Ngày {item.day}/10: {item.count} lượt</div>
                                                    <div className="text-pink-300 font-mono">+{formatMoney(item.revenue)}</div>
                                                </div>

                                                {/* Bar capsule */}
                                                <div
                                                    style={{ height: `${heightPercent}%` }}
                                                    className={`w-full rounded-t-md transition-all duration-300 ${
                                                        isActive
                                                            ? 'bg-gradient-to-t from-cyan-600 via-cyan-400 to-blue-400 shadow-[0_0_10px_rgba(34,211,238,0.35)] group-hover:from-cyan-400 group-hover:to-pink-400'
                                                            : 'bg-white/5 group-hover:bg-white/10'
                                                    }`}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* X-Axis Day Labels */}
                                <div className="mt-2 flex justify-between px-2 text-[10px] font-mono text-slate-500">
                                    <span>01/10</span>
                                    <span>05/10</span>
                                    <span>10/10</span>
                                    <span>15/10</span>
                                    <span>20/10</span>
                                    <span>25/10</span>
                                    <span>31/10</span>
                                </div>
                            </div>

                            {/* Summary footnote */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-xs text-slate-400">
                                <div className="flex items-center gap-2">
                                    <span className="size-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                                    <span>Có đơn hàng giao vào tủ / Mở khóa OTP thành công</span>
                                </div>
                                <span className="font-mono text-slate-300">Tổng 47 lượt ghi nhận</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* 2. Top 5 Owners with Highest Usage (5 Cols) */}
                <div className="lg:col-span-5">
                    <Card
                        title="Top 5 Chủ Tủ & Trạm có lượt dùng cao nhất"
                        description="Xếp hạng các trạm tủ thông minh có tần suất nhận hàng cao nhất trong tháng"
                    >
                        <div className="space-y-3.5">
                            {topOwners.map((inv, rank) => {
                                const maxTop = topOwners[0]?.totalUsages || 5
                                const barPercent = Math.round(((inv.totalUsages || 0) / maxTop) * 100)
                                const firstUsage = inv.usageHistory?.[0]
                                const boxCode = firstUsage?.boxId || `BOX-${rank + 1}`
                                const boxName = firstUsage?.boxName || `Lockship Box #${boxCode}`

                                const medalColors = [
                                    'border-amber-400/50 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
                                    'border-slate-300/50 bg-slate-400/20 text-slate-200',
                                    'border-amber-700/50 bg-amber-800/20 text-amber-400',
                                    'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
                                    'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
                                ]

                                return (
                                    <div
                                        key={inv._id || rank}
                                        className="rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-cyan-400/30 hover:bg-white/[0.04]"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span
                                                    className={`grid size-6 shrink-0 place-items-center rounded-lg border text-xs font-bold font-mono ${
                                                        medalColors[rank] || medalColors[3]
                                                    }`}
                                                >
                                                    #{rank + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-white truncate">
                                                        {inv.ownerId?.name || 'Chủ tủ'}
                                                    </p>
                                                    <p className="text-[10px] text-cyan-300 font-mono truncate">
                                                        {boxCode} · {boxName}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="font-mono text-xs font-extrabold text-pink-400">
                                                    {inv.totalUsages || 0} lượt
                                                </span>
                                                <p className="text-[10px] text-slate-400 font-mono">
                                                    {formatMoney(inv.totalAmount)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                                            <div
                                                style={{ width: `${barPercent}%` }}
                                                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-pink-500 transition-all duration-500"
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Reconciliation Table: 15 Owners Detail */}
            <Card
                title="Bảng đối soát chi tiết 15 Chủ tủ (Reconciliation Table)"
                description="Danh sách toàn bộ 15 Chủ sở hữu tủ khóa, số lượt nhận hàng thực tế, tổng cước và trạng thái thanh toán BIDV"
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Status Filter Tabs */}
                        <div className="flex items-center rounded-lg border border-white/10 bg-[#12192c] p-0.5 text-[11px] font-semibold">
                            <button
                                type="button"
                                onClick={() => setStatusFilter('ALL')}
                                className={`rounded px-2.5 py-1 transition ${
                                    statusFilter === 'ALL' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Tất cả ({invoices.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('PAID')}
                                className={`rounded px-2.5 py-1 transition ${
                                    statusFilter === 'PAID' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Đã thanh toán ({summary.countPaid})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('PENDING_VERIFICATION')}
                                className={`rounded px-2.5 py-1 transition ${
                                    statusFilter === 'PENDING_VERIFICATION' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Chờ duyệt ({summary.countPending})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('UNPAID')}
                                className={`rounded px-2.5 py-1 transition ${
                                    statusFilter === 'UNPAID' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Chưa thu ({summary.countUnpaid})
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Tìm tên, SĐT, mã tủ..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="rounded-lg border border-white/10 bg-white/[0.04] py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none w-48 sm:w-56"
                            />
                        </div>
                    </div>
                }
            >
                {filteredInvoices.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                        <Users size={32} className="mx-auto mb-2 text-slate-500" />
                        <p className="text-sm">Không tìm thấy hóa đơn cước nào phù hợp điều kiện lọc.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase tracking-wider bg-white/[0.02]">
                                    <th className="py-3 px-3">STT</th>
                                    <th className="py-3 px-3">Chủ Tủ & Liên Hệ</th>
                                    <th className="py-3 px-3">Trạm Tủ Khóa (Box)</th>
                                    <th className="py-3 px-3 text-center">Số Lượt</th>
                                    <th className="py-3 px-3 text-right">Đơn Giá</th>
                                    <th className="py-3 px-3 text-right">Tổng Cước</th>
                                    <th className="py-3 px-3">Cú Pháp Chuyển Khoản</th>
                                    <th className="py-3 px-3 text-center">Trạng Thái</th>
                                    <th className="py-3 px-3">Ngày Thanh Toán</th>
                                    <th className="py-3 px-3 text-right">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredInvoices.map((inv, idx) => {
                                    const firstUsage = inv.usageHistory?.[0]
                                    const boxCode = firstUsage?.boxId || `BOX-${String(idx + 1).padStart(2, '0')}`
                                    const boxName = firstUsage?.boxName || `Lockship Box #${boxCode}`
                                    const address = firstUsage?.boxAddress || inv.ownerId?.address || 'Cần Thơ'
                                    const isPaid = inv.paymentStatus === 'PAID'
                                    const isPending = inv.paymentStatus === 'PENDING_VERIFICATION'

                                    return (
                                        <tr key={inv._id || idx} className="hover:bg-white/[0.02] transition">
                                            <td className="py-3 px-3 font-mono text-slate-400 font-bold">
                                                {idx + 1}
                                            </td>
                                            <td className="py-3 px-3">
                                                <p className="font-bold text-white">{inv.ownerId?.name || 'Chủ tủ'}</p>
                                                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                                                    <span>{inv.ownerId?.phone || '—'}</span>
                                                    <span>·</span>
                                                    <span className="truncate max-w-[140px]">{inv.ownerId?.email || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <p className="font-mono font-bold text-cyan-300">{boxCode}</p>
                                                <p className="text-[11px] text-slate-200 line-clamp-1">{boxName}</p>
                                                <p className="text-[10px] text-slate-400 truncate max-w-xs">{address}</p>
                                            </td>
                                            <td className="py-3 px-3 text-center font-mono font-bold text-white text-sm">
                                                {inv.totalUsages || 0}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-slate-300">
                                                {formatMoney(inv.unitPrice || 5000)}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-extrabold text-pink-400 text-sm">
                                                {formatMoney(inv.totalAmount)}
                                            </td>
                                            <td className="py-3 px-3 font-mono text-slate-200 font-semibold text-[11px]">
                                                <span className="rounded bg-white/5 px-2 py-0.5 border border-white/10">
                                                    {inv.transferSyntax || '—'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-center whitespace-nowrap">
                                                {isPaid ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                                        <CheckCircle2 size={11} className="text-emerald-400" />
                                                        Đã thanh toán
                                                    </span>
                                                ) : isPending ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 animate-pulse">
                                                        <Clock size={11} className="text-amber-400" />
                                                        Chờ đối soát
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold text-rose-300">
                                                        <AlertCircle size={11} className="text-rose-400" />
                                                        Chưa thu
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                                                {formatDate(inv.paidAt)}
                                            </td>
                                            <td className="py-3 px-3 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedInvoiceForHistory(inv)}
                                                        className="ui-button-secondary px-2.5 py-1 text-[11px] font-semibold gap-1"
                                                        title="Xem chi tiết các lượt dùng"
                                                    >
                                                        <Eye size={12} />
                                                        Lịch sử
                                                    </button>
                                                    {isPending && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setVerifyingInvoice(inv)
                                                                setAdminNote(`Đã kiểm tra khớp lệnh VietQR BIDV ${formatMoney(inv.totalAmount)}`)
                                                            }}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/30 transition shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                                                        >
                                                            <Check size={12} />
                                                            Duyệt cước
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-white/10 font-bold bg-white/[0.02]">
                                    <td colSpan={3} className="py-3 px-3 text-slate-300 text-right">
                                        Tổng cộng ({filteredInvoices.length} trạm tủ):
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono font-extrabold text-white text-sm">
                                        {filteredInvoices.reduce((acc, inv) => acc + (inv.totalUsages || 0), 0)}
                                    </td>
                                    <td className="py-3 px-3" />
                                    <td className="py-3 px-3 text-right font-mono font-extrabold text-pink-400 text-sm">
                                        {formatMoney(filteredInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0))}
                                    </td>
                                    <td colSpan={4} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </Card>

            {/* Modal Chi Tiết Lịch Sử Dùng của 1 Chủ Tủ */}
            <Modal
                open={!!selectedInvoiceForHistory}
                onClose={() => setSelectedInvoiceForHistory(null)}
                title={`Lịch sử sử dụng tủ - ${selectedInvoiceForHistory?.ownerId?.name || 'Owner'}`}
                description={`Kỳ cước tháng ${selectedInvoiceForHistory?.month || selectedMonth} · Tổng ${selectedInvoiceForHistory?.totalUsages || 0} lượt (5.000 đ/lượt)`}
                size="xl"
            >
                {selectedInvoiceForHistory && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
                            <div>
                                <span className="text-slate-400">Chủ sở hữu:</span>{' '}
                                <span className="font-bold text-white">{selectedInvoiceForHistory.ownerId?.name}</span>{' '}
                                <span className="text-slate-400">({selectedInvoiceForHistory.ownerId?.phone})</span>
                            </div>
                            <div>
                                <span className="text-slate-400">Tổng tiền cước:</span>{' '}
                                <span className="font-mono font-extrabold text-pink-400 text-sm">
                                    {formatMoney(selectedInvoiceForHistory.totalAmount)}
                                </span>
                            </div>
                        </div>

                        {(!selectedInvoiceForHistory.usageHistory || selectedInvoiceForHistory.usageHistory.length === 0) ? (
                            <div className="py-8 text-center text-slate-400">
                                <Activity size={32} className="mx-auto mb-2 text-slate-500" />
                                <p className="text-sm">Chưa có lượt dùng nào phát sinh trong tháng này.</p>
                            </div>
                        ) : (
                            <div className="max-h-[26rem] overflow-y-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 bg-[#141b2d] z-10">
                                            <th className="py-2.5 px-3">Thời Gian Sử Dụng</th>
                                            <th className="py-2.5 px-3">Mã Đơn Giả Lập</th>
                                            <th className="py-2.5 px-3">Loại Thao Tác</th>
                                            <th className="py-2.5 px-3 text-right">Cước Phí</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {selectedInvoiceForHistory.usageHistory.map((item, idx) => (
                                            <tr key={item._id || idx} className="hover:bg-white/[0.02] transition">
                                                <td className="py-2.5 px-3 font-mono text-cyan-300">
                                                    {formatDate(item.usedAt)}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono text-slate-300">
                                                    {item.orderReference || '—'}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                                        item.actionType === 'DELIVERED_TO_LOCKER'
                                                            ? 'bg-blue-500/15 text-blue-300 border border-blue-400/30'
                                                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                                                    }`}>
                                                        {item.actionType === 'DELIVERED_TO_LOCKER'
                                                            ? 'Giao hàng vào tủ'
                                                            : item.actionType === 'OTP_PICKUP_SUCCESS'
                                                            ? 'Mở tủ lấy hàng (OTP)'
                                                            : item.actionType}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono font-bold text-pink-400">
                                                    +{formatMoney(item.cost || 5000)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Modal Duyệt Thanh Toán Cước (Admin Verification) */}
            <Modal
                open={!!verifyingInvoice}
                onClose={() => setVerifyingInvoice(null)}
                title="Xác nhận & Duyệt thanh toán cước VietQR BIDV"
                description="Đối soát số tiền đã nhận qua tài khoản BIDV 6910924374 (TRAN THI THUY QUYEN)"
                size="md"
            >
                {verifyingInvoice && (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Chủ tủ:</span>
                                <span className="font-bold text-white">{verifyingInvoice.ownerId?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Kỳ cước:</span>
                                <span className="font-mono text-white">Tháng {verifyingInvoice.month}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Số tiền cần thu:</span>
                                <span className="font-mono text-base font-extrabold text-pink-400">
                                    {formatMoney(verifyingInvoice.totalAmount)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Cú pháp CK:</span>
                                <span className="font-mono font-bold text-cyan-300">{verifyingInvoice.transferSyntax}</span>
                            </div>
                            {verifyingInvoice.paymentProofNote && (
                                <div className="mt-2 pt-2 border-t border-white/5">
                                    <span className="text-slate-400 block mb-0.5">Lời nhắn của Owner:</span>
                                    <p className="text-amber-300 italic">{verifyingInvoice.paymentProofNote}</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Ghi chú duyệt đối soát (Tùy chọn):
                            </label>
                            <input
                                type="text"
                                placeholder="Ví dụ: Đã nhận 25.000đ lúc 10:35 sáng qua BIDV"
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setVerifyingInvoice(null)}
                                className="ui-button-secondary text-xs"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                disabled={submittingVerify}
                                onClick={handleConfirmVerify}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-extrabold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition hover:scale-105 active:scale-95 disabled:opacity-50"
                            >
                                <Check size={14} />
                                {submittingVerify ? 'Đang duyệt...' : 'Xác nhận Đã Nhận Tiền'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </section>
    )
}

