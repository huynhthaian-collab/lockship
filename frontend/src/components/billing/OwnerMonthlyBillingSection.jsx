import { useCallback, useEffect, useState } from 'react'
import {
    Activity,
    AlertCircle,
    Check,
    CheckCircle2,
    Clock,
    Copy,
    CreditCard,
    DollarSign,
    ExternalLink,
    FileText,
    QrCode,
    RefreshCw,
    ShieldCheck,
    Smartphone,
} from 'lucide-react'
import Card from '../ui/Card.jsx'
import Modal from '../ui/Modal.jsx'
import StatusPill from '../StatusPill.jsx'
import SpatialTiltCard from '../spatial/SpatialTiltCard.jsx'
import { invoiceApi } from '../../services/ownerApi.js'
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

export default function OwnerMonthlyBillingSection({ onRefresh }) {
    const [invoiceData, setInvoiceData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState('')

    // Modals
    const [historyModalOpen, setHistoryModalOpen] = useState(false)
    const [momoModalOpen, setMomoModalOpen] = useState(false)
    const [copiedSyntax, setCopiedSyntax] = useState(false)
    const [copiedPhone, setCopiedPhone] = useState(false)
    const [proofNote, setProofNote] = useState('')
    const [notifyingPaid, setNotifyingPaid] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')

    const loadInvoice = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        setRefreshing(true)
        setError('')
        try {
            const data = await invoiceApi.getCurrent()
            setInvoiceData(data)
        } catch (err) {
            setError(err.message || 'Không thể tải thông tin cước phí tháng.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        loadInvoice()
    }, [loadInvoice])

    // Real-time socket events for usage charging and verification
    const onBillingUsage = useCallback(() => {
        loadInvoice(true)
        if (onRefresh) onRefresh()
    }, [loadInvoice, onRefresh])

    const onPaymentVerified = useCallback(() => {
        loadInvoice(true)
        setSuccessMessage('Hóa đơn cước của bạn đã được Admin duyệt thanh toán thành công!')
        setTimeout(() => setSuccessMessage(''), 8000)
        if (onRefresh) onRefresh()
    }, [loadInvoice, onRefresh])

    useSocketEvent('billing:usage_recorded', onBillingUsage)
    useSocketEvent('billing:payment_verified', onPaymentVerified)

    const invoice = invoiceData?.invoice || {
        month: new Date().toISOString().slice(0, 7),
        totalUsages: 0,
        unitPrice: 5000,
        totalAmount: 0,
        usageHistory: [],
        paymentStatus: 'UNPAID',
        transferSyntax: 'LOCKSHIP OWNER',
    }

    const momoConfig = invoiceData?.momoConfig || {
        phone: '0909000001',
        accountName: 'CÔNG TY TNHH LOCKSHIP VIỆT NAM',
        qrUrl: '',
        qrImageUrl: '',
    }

    const handleCopy = (text, type) => {
        navigator.clipboard.writeText(text)
        if (type === 'syntax') {
            setCopiedSyntax(true)
            setTimeout(() => setCopiedSyntax(false), 2500)
        } else {
            setCopiedPhone(true)
            setTimeout(() => setCopiedPhone(false), 2500)
        }
    }

    const handleNotifyPaid = async () => {
        if (!invoice._id) return
        setNotifyingPaid(true)
        try {
            await invoiceApi.notifyPaid(invoice._id, { paymentProofNote: proofNote })
            setSuccessMessage('Đã gửi thông báo thanh toán thành công! Vui lòng chờ Admin xác nhận.')
            setMomoModalOpen(false)
            setProofNote('')
            loadInvoice(true)
            setTimeout(() => setSuccessMessage(''), 8000)
        } catch (err) {
            alert(err.message || 'Lỗi gửi xác nhận thanh toán.')
        } finally {
            setNotifyingPaid(false)
        }
    }

    const isPaid = invoice.paymentStatus === 'PAID'
    const isPending = invoice.paymentStatus === 'PENDING_VERIFICATION'

    return (
        <section aria-labelledby="billing-heading" className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-pink-400">
                        Cước Phí Vận Hành Tủ Khóa
                    </p>
                    <h2 id="billing-heading" className="text-xl font-extrabold text-white sm:text-2xl">
                        Tổng kết cước tháng {invoice.month ? `${invoice.month.split('-')[1]}/${invoice.month.split('-')[0]}` : ''}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => loadInvoice()}
                        disabled={refreshing}
                        className="ui-button-secondary gap-1.5 px-3 py-1.5 text-xs font-semibold"
                        type="button"
                    >
                        <RefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
                        Làm mới
                    </button>
                </div>
            </div>

            {successMessage && (
                <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm font-semibold text-emerald-300 animate-page-in">
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                    <span>{successMessage}</span>
                </div>
            )}

            {error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* Billing Bento Card */}
            <SpatialTiltCard className="rounded-2xl" maxTilt={4}>
                <div className="relative overflow-hidden rounded-2xl border border-pink-500/20 bg-gradient-to-br from-[#181126] via-[#101426] to-[#0c101c] p-6 shadow-[0_10px_35px_-5px_rgba(219,39,119,0.15)] sm:p-7">
                    {/* Decorative glowing gradient circle */}
                    <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-pink-500/15 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-purple-500/10 blur-3xl" />

                    <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                        {/* Left KPI Highlights */}
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs font-bold text-pink-300">
                                    <DollarSign size={13} className="text-pink-400" />
                                    Cước dịch vụ 5.000 VNĐ / lượt dùng
                                </span>

                                {isPaid ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
                                        <CheckCircle2 size={13} className="text-emerald-400" />
                                        Đã thanh toán thành công
                                    </span>
                                ) : isPending ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300 animate-pulse">
                                        <Clock size={13} className="text-amber-400" />
                                        Đang chờ Admin xác nhận nhận tiền
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-300">
                                        <AlertCircle size={13} className="text-rose-400" />
                                        Chưa thanh toán
                                    </span>
                                )}
                            </div>

                            <div>
                                <p className="text-xs font-medium text-slate-400">
                                    Tổng tiền cước phát sinh trong tháng:
                                </p>
                                <div className="mt-1 flex items-baseline gap-3">
                                    <span className="font-mono text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
                                        {formatMoney(invoice.totalAmount)}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-400">
                                        ({invoice.totalUsages || 0} lượt mở & giao tủ)
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-400">
                                    Hệ thống tự động ghi nhận +5.000 VNĐ mỗi khi có đơn hàng giao thành công hoặc mở tủ bằng mã QR.
                                </p>
                            </div>
                        </div>

                        {/* Right Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setHistoryModalOpen(true)}
                                className="ui-button-secondary gap-2 px-4 py-2.5 text-xs font-bold"
                            >
                                <FileText size={15} />
                                Chi tiết {invoice.totalUsages || 0} lượt dùng
                            </button>

                            {!isPaid && (
                                <button
                                    type="button"
                                    onClick={() => setMomoModalOpen(true)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-pink-400/40 bg-gradient-to-r from-pink-600 to-rose-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-[0_0_20px_rgba(219,39,119,0.4)] transition-all hover:scale-105 hover:from-pink-500 hover:to-rose-500 active:scale-95"
                                >
                                    <QrCode size={16} />
                                    {isPending ? 'Xem lại mã MoMo' : 'Thanh toán MoMo QR'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </SpatialTiltCard>

            {/* Modal Chi tiết lịch sử lượt dùng */}
            <Modal
                open={historyModalOpen}
                onClose={() => setHistoryModalOpen(false)}
                title={`Nhật ký lượt dùng tủ - Tháng ${invoice.month}`}
                description="Danh sách các lượt mở khóa và giao hàng hoàn tất được tính cước 5.000 VNĐ"
                size="lg"
            >
                {(!invoice.usageHistory || invoice.usageHistory.length === 0) ? (
                    <div className="py-8 text-center text-slate-400">
                        <Activity size={32} className="mx-auto mb-2 text-slate-500" />
                        <p className="text-sm">Chưa có lượt dùng nào phát sinh trong tháng này.</p>
                    </div>
                ) : (
                    <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
                        {invoice.usageHistory.map((item, idx) => (
                            <div key={item._id || idx} className="py-3 flex items-center justify-between text-xs">
                                <div>
                                    <p className="font-semibold text-white">
                                        {item.boxName || item.boxId}
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                        Loại: <span className="text-cyan-300 font-medium">{item.actionType}</span>
                                        {item.orderReference && ` · Mã: ${item.orderReference}`}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                        {formatDate(item.usedAt)}
                                    </p>
                                </div>
                                <span className="font-mono font-bold text-pink-400">
                                    +{formatMoney(item.cost || 5000)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>

            {/* Modal Thanh toán MoMo QR */}
            <Modal
                open={momoModalOpen}
                onClose={() => setMomoModalOpen(false)}
                title="Thanh toán cước phí qua MoMo"
                description="Quét mã QR MoMo hoặc chuyển khoản với đúng cú pháp dưới đây để được duyệt tự động"
                size="md"
            >
                <div className="space-y-4">
                    {/* QR Code Container */}
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-pink-500/20 bg-pink-950/20 p-5">
                        <div className="relative overflow-hidden rounded-xl border-2 border-pink-400/50 bg-white p-2.5 shadow-[0_0_25px_rgba(219,39,119,0.25)]">
                            <img
                                src={momoConfig.qrImageUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=momo`}
                                alt="Mã MoMo QR Lockship"
                                className="size-48 object-contain sm:size-52"
                                onError={(e) => {
                                    // fallback if image fail
                                    e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`2|99|0909000001|LOCKSHIP|${invoice.totalAmount}|${invoice.transferSyntax}`)}`
                                }}
                            />
                        </div>
                        <p className="mt-3 text-center text-xs font-bold text-pink-300">
                            Quét bằng App MoMo hoặc ứng dụng Ngân hàng
                        </p>
                    </div>

                    {/* Details Box */}
                    <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">Người thụ hưởng:</span>
                            <span className="font-bold text-white">{momoConfig.accountName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">Số điện thoại MoMo:</span>
                            <div className="flex items-center gap-1.5 font-mono font-bold text-pink-400">
                                <span>{momoConfig.phone}</span>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(momoConfig.phone, 'phone')}
                                    className="p-1 text-slate-400 hover:text-white"
                                    title="Sao chép số điện thoại"
                                >
                                    {copiedPhone ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">Số tiền thanh toán:</span>
                            <span className="font-mono text-base font-extrabold text-pink-400">
                                {formatMoney(invoice.totalAmount)}
                            </span>
                        </div>

                        {/* Transfer Syntax with Copy */}
                        <div className="mt-3 rounded-lg border border-pink-400/30 bg-pink-500/10 p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase text-pink-300">
                                    Cú pháp chuyển khoản bắt buộc:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(invoice.transferSyntax, 'syntax')}
                                    className="flex items-center gap-1 rounded bg-pink-500/30 px-2 py-0.5 text-[10px] font-bold text-pink-200 transition hover:bg-pink-500/50"
                                >
                                    {copiedSyntax ? (
                                        <>
                                            <Check size={11} className="text-emerald-400" /> Đã sao chép
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={11} /> Sao chép cú pháp
                                        </>
                                    )}
                                </button>
                            </div>
                            <p className="mt-1 font-mono text-sm font-extrabold text-white tracking-wider">
                                {invoice.transferSyntax}
                            </p>
                        </div>
                    </div>

                    {/* Optional Note / Transaction Reference */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Ghi chú hoặc mã giao dịch MoMo (Tùy chọn):
                        </label>
                        <input
                            type="text"
                            placeholder="Ví dụ: Đã chuyển qua MoMo lúc 14:30 hoặc Mã GD: 123456"
                            value={proofNote}
                            onChange={(e) => setProofNote(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-pink-500 focus:outline-none"
                        />
                    </div>

                    {/* Submit Confirmation */}
                    <div className="pt-2">
                        <button
                            type="button"
                            disabled={notifyingPaid || isPaid}
                            onClick={handleNotifyPaid}
                            className="w-full rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-xs font-extrabold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:from-emerald-500 hover:to-teal-500 active:scale-98 disabled:opacity-50"
                        >
                            {notifyingPaid ? 'Đang gửi thông báo...' : '✓ Tôi đã chuyển khoản thành công'}
                        </button>
                    </div>
                </div>
            </Modal>
        </section>
    )
}
