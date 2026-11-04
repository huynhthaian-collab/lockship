import { useCallback, useEffect, useState } from 'react'
import {
    AlertCircle,
    Check,
    CheckCircle2,
    Clock,
    DollarSign,
    ExternalLink,
    Filter,
    HelpCircle,
    QrCode,
    RefreshCw,
    Search,
    ShieldCheck,
    Smartphone,
    User,
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

export default function AdminBillingManagementSection({ onActionCompleted }) {
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

    // Filters
    const [monthFilter, setMonthFilter] = useState('ALL')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const [search, setSearch] = useState('')

    // Verify modal state
    const [verifyingInvoice, setVerifyingInvoice] = useState(null)
    const [adminNote, setAdminNote] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const loadInvoices = useCallback(
        async (silent = false) => {
            if (!silent) setLoading(true)
            setRefreshing(true)
            setError('')
            try {
                const data = await adminInvoiceApi.listInvoices({
                    month: monthFilter,
                    status: statusFilter,
                    search,
                })
                setInvoices(data.invoices || [])
                if (data.summary) {
                    setSummary(data.summary)
                }
            } catch (err) {
                setError(err.message || 'Không thể tải danh sách hóa đơn cước.')
            } finally {
                setLoading(false)
                setRefreshing(false)
            }
        },
        [monthFilter, statusFilter, search]
    )

    useEffect(() => {
        loadInvoices()
    }, [loadInvoices])

    // Real-time listener for owner paying or new usage
    const onLiveBillingUpdate = useCallback(() => {
        loadInvoices(true)
    }, [loadInvoices])

    useSocketEvent('admin:invoice_pending', onLiveBillingUpdate)
    useSocketEvent('billing:usage_recorded', onLiveBillingUpdate)

    const handleApprovePayment = async (e) => {
        e.preventDefault()
        if (!verifyingInvoice) return

        setSubmitting(true)
        try {
            await adminInvoiceApi.verifyPayment(verifyingInvoice._id, {
                note: adminNote.trim(),
            })

            setSuccessMessage(
                `Đã duyệt thanh toán thành công hóa đơn cước tháng ${verifyingInvoice.month} của ${verifyingInvoice.ownerId?.name || 'Owner'}!`
            )
            setVerifyingInvoice(null)
            setAdminNote('')
            loadInvoices(true)
            if (onActionCompleted) onActionCompleted()
            setTimeout(() => setSuccessMessage(''), 8000)
        } catch (err) {
            alert(err.message || 'Lỗi khi duyệt hóa đơn.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Card
            title={
                <div className="flex items-center gap-2">
                    <span className="text-pink-400">Quản lý Cước & Thanh toán Tháng (MoMo QR)</span>
                    {summary.countPending > 0 && (
                        <span className="rounded-full bg-pink-500/20 border border-pink-500/40 px-2 py-0.5 text-xs font-bold text-pink-300 animate-pulse">
                            {summary.countPending} đơn chờ duyệt MoMo
                        </span>
                    )}
                </div>
            }
            description="Tự động tính cước 5.000 VNĐ / lượt dùng tủ khóa hợp lệ. Quản lý tổng kết hóa đơn cuối tháng, đối soát và duyệt thanh toán chuyển khoản qua MoMo."
            action={
                <button
                    onClick={() => loadInvoices()}
                    disabled={refreshing}
                    className="ui-button-secondary gap-1.5 px-3 py-1.5 text-xs font-semibold"
                    type="button"
                >
                    <RefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
                    Làm mới
                </button>
            }
        >
            {successMessage && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300 animate-page-in">
                    <CheckCircle2 size={16} />
                    <span>{successMessage}</span>
                </div>
            )}

            {error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* KPI Summary Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Tổng doanh thu phát sinh
                    </p>
                    <p className="mt-1 font-mono text-2xl font-extrabold text-white">
                        {formatMoney(summary.totalRevenue)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        Từ tất cả các lượt mở tủ khóa
                    </p>
                </div>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                        Đã thu tiền (PAID)
                    </p>
                    <p className="mt-1 font-mono text-2xl font-extrabold text-emerald-300">
                        {formatMoney(summary.totalPaid)}
                    </p>
                    <p className="mt-1 text-xs text-emerald-500/80">
                        {summary.countPaid} hóa đơn hoàn tất
                    </p>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                        Chờ duyệt MoMo (PENDING)
                    </p>
                    <p className="mt-1 font-mono text-2xl font-extrabold text-amber-300">
                        {formatMoney(summary.totalPending)}
                    </p>
                    <p className="mt-1 text-xs text-amber-500/80">
                        {summary.countPending} chủ tủ đã báo chuyển
                    </p>
                </div>

                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                        Chưa thanh toán (UNPAID)
                    </p>
                    <p className="mt-1 font-mono text-2xl font-extrabold text-rose-300">
                        {formatMoney(summary.totalUnpaid)}
                    </p>
                    <p className="mt-1 text-xs text-rose-500/80">
                        {summary.countUnpaid} hóa đơn nợ cước
                    </p>
                </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 rounded-xl border border-white/5 bg-white/[0.01] p-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Tìm theo tên, SĐT, cú pháp..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="rounded-lg border border-white/10 bg-white/[0.04] py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-white/10 bg-[#0f172a] px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="PENDING_VERIFICATION">Đang chờ duyệt MoMo</option>
                        <option value="UNPAID">Chưa thanh toán</option>
                        <option value="PAID">Đã thanh toán (PAID)</option>
                    </select>

                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="rounded-lg border border-white/10 bg-[#0f172a] px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                    >
                        <option value="ALL">Tất cả các tháng</option>
                        <option value="2026-11">Tháng 11/2026</option>
                        <option value="2026-10">Tháng 10/2026</option>
                    </select>
                </div>

                <span className="text-slate-400 text-xs">
                    Hiển thị <strong>{invoices.length}</strong> hóa đơn
                </span>
            </div>

            {/* Invoices Table */}
            {invoices.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                    <DollarSign size={32} className="mx-auto mb-2 text-slate-500" />
                    <p className="text-sm font-semibold">Không tìm thấy hóa đơn cước nào phù hợp.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase tracking-wider">
                                <th className="py-2.5 px-3">Chủ sở hữu tủ</th>
                                <th className="py-2.5 px-3">Tháng</th>
                                <th className="py-2.5 px-3">Số lượt dùng</th>
                                <th className="py-2.5 px-3">Tổng tiền</th>
                                <th className="py-2.5 px-3">Cú pháp MoMo</th>
                                <th className="py-2.5 px-3">Trạng thái</th>
                                <th className="py-2.5 px-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {invoices.map((inv) => (
                                <tr key={inv._id} className="hover:bg-white/[0.02] transition">
                                    <td className="py-3 px-3">
                                        <p className="font-bold text-white">
                                            {inv.ownerId?.name || 'Owner'}
                                        </p>
                                        <p className="text-[11px] text-slate-400 font-mono">
                                            {inv.ownerId?.phone || '—'}
                                        </p>
                                    </td>
                                    <td className="py-3 px-3 font-mono font-bold text-cyan-300">
                                        {inv.month}
                                    </td>
                                    <td className="py-3 px-3 font-semibold text-slate-200">
                                        {inv.totalUsages || 0} lượt
                                    </td>
                                    <td className="py-3 px-3 font-mono font-extrabold text-pink-400 text-sm">
                                        {formatMoney(inv.totalAmount)}
                                    </td>
                                    <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                                        {inv.transferSyntax || '—'}
                                    </td>
                                    <td className="py-3 px-3">
                                        {inv.paymentStatus === 'PAID' ? (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                                <CheckCircle2 size={11} /> Đã thanh toán
                                            </span>
                                        ) : inv.paymentStatus === 'PENDING_VERIFICATION' ? (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 animate-pulse">
                                                <Clock size={11} /> Chờ duyệt MoMo
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                                                <AlertCircle size={11} /> Chưa thanh toán
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                        {inv.paymentStatus !== 'PAID' ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setVerifyingInvoice(inv)
                                                    setAdminNote('')
                                                }}
                                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/30 active:scale-95"
                                            >
                                                <ShieldCheck size={13} /> Duyệt đã nhận tiền
                                            </button>
                                        ) : (
                                            <span className="text-[11px] text-slate-500 font-mono">
                                                {inv.paidAt ? formatDate(inv.paidAt) : 'Đã duyệt'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Duyệt Nhận Tiền */}
            <Modal
                open={!!verifyingInvoice}
                onClose={() => setVerifyingInvoice(null)}
                title="Xác nhận nhận tiền cước MoMo"
                description="Đối soát số tiền và mã chuyển khoản MoMo từ chủ tủ trước khi phê duyệt"
                size="sm"
            >
                {verifyingInvoice && (
                    <form onSubmit={handleApprovePayment} className="space-y-4">
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3.5 text-xs text-slate-200 space-y-1.5">
                            <p>
                                <strong>Chủ tủ:</strong> {verifyingInvoice.ownerId?.name || 'Owner'} (
                                {verifyingInvoice.ownerId?.phone || '—'})
                            </p>
                            <p>
                                <strong>Tháng cước:</strong> {verifyingInvoice.month} ({verifyingInvoice.totalUsages || 0} lượt)
                            </p>
                            <p>
                                <strong>Số tiền cần thu:</strong>{' '}
                                <span className="font-mono font-extrabold text-pink-400 text-sm">
                                    {formatMoney(verifyingInvoice.totalAmount)}
                                </span>
                            </p>
                            <p>
                                <strong>Cú pháp MoMo:</strong>{' '}
                                <span className="font-mono text-cyan-300 font-bold">
                                    {verifyingInvoice.transferSyntax}
                                </span>
                            </p>
                            {verifyingInvoice.paymentProofNote && (
                                <p className="pt-1 text-[11px] text-amber-300 border-t border-white/5">
                                    <em>Tin nhắn từ chủ tủ:</em> "{verifyingInvoice.paymentProofNote}"
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Ghi chú đối soát của Admin (Tùy chọn):
                            </label>
                            <input
                                type="text"
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                placeholder="Ví dụ: Đã kiểm tra sao kê MoMo khớp số tiền"
                                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                            />
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setVerifyingInvoice(null)}
                                className="ui-button-secondary px-3.5 py-2 text-xs font-bold"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-extrabold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
                            >
                                {submitting ? 'Đang duyệt...' : '✓ Phê duyệt Đã nhận tiền'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </Card>
    )
}
