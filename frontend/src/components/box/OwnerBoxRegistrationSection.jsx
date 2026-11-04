import { useCallback, useEffect, useState } from 'react'
import {
    AlertCircle,
    ArrowRight,
    Box,
    CheckCircle2,
    Clock,
    Info,
    Lock,
    MapPin,
    Plus,
    QrCode,
    RefreshCw,
    Shield,
    Sparkles,
    Unlock,
} from 'lucide-react'
import Card from '../ui/Card.jsx'
import Modal from '../ui/Modal.jsx'
import SpatialTiltCard from '../spatial/SpatialTiltCard.jsx'
import { boxRegistrationApi } from '../../services/ownerApi.js'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'

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

export default function OwnerBoxRegistrationSection({ onRefresh }) {
    const [availableBoxes, setAvailableBoxes] = useState([])
    const [myBoxes, setMyBoxes] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    // Modal state for registration
    const [selectedBox, setSelectedBox] = useState(null)
    const [requestedAddress, setRequestedAddress] = useState('')
    const [requestedNote, setRequestedNote] = useState('')
    const [addressError, setAddressError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Modal state for QR view
    const [qrModalBox, setQrModalBox] = useState(null)

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        setRefreshing(true)
        setError('')
        try {
            const [available, mine] = await Promise.all([
                boxRegistrationApi.listAvailable(),
                boxRegistrationApi.listMyBoxes(),
            ])
            setAvailableBoxes(available || [])
            setMyBoxes(mine || [])
        } catch (err) {
            setError(err.message || 'Không thể tải danh sách tủ khóa.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Real-time notification when Admin approves an installation
    const onInstallationConfirmed = useCallback(
        (data) => {
            loadData(true)
            setSuccessMessage(
                `🎉 Chúc mừng! Tủ khóa ${data.name || data.boxId} của bạn đã được Admin nghiệm thu và kích hoạt thành công tại: ${data.address}!`
            )
            setTimeout(() => setSuccessMessage(''), 10000)
            if (onRefresh) onRefresh()
        },
        [loadData, onRefresh]
    )

    useSocketEvent('box:installation_confirmed', onInstallationConfirmed)

    const handleOpenRegisterModal = (box) => {
        setSelectedBox(box)
        setRequestedAddress('')
        setRequestedNote('')
        setAddressError('')
    }

    const handleSubmitRegistration = async (e) => {
        e.preventDefault()
        const cleanAddress = requestedAddress.trim()

        // Strict Client-side validation: must have at least 10 chars
        if (!cleanAddress) {
            setAddressError('Vui lòng nhập địa chỉ đề xuất lắp đặt.')
            return
        }
        if (cleanAddress.length < 10) {
            setAddressError('Địa chỉ đề xuất phải có ít nhất 10 ký tự để Admin xác định vị trí chính xác.')
            return
        }

        setSubmitting(true)
        setAddressError('')
        try {
            const result = await boxRegistrationApi.requestRegistration(selectedBox.boxId, {
                requestedAddress: cleanAddress,
                requestedNote: requestedNote.trim(),
            })

            setSelectedBox(null)
            setSuccessMessage(
                result.message ||
                    'Yêu cầu đăng ký tủ khóa thành công! Vui lòng chờ Quản trị viên xét duyệt và nghiệm thu lắp đặt.'
            )
            setTimeout(() => setSuccessMessage(''), 8000)
            loadData(true)
            if (onRefresh) onRefresh()
        } catch (err) {
            setAddressError(err.message || 'Lỗi gửi yêu cầu đăng ký tủ khóa.')
        } finally {
            setSubmitting(false)
        }
    }

    const pendingBoxes = myBoxes.filter((b) => b.registrationStatus === 'PENDING_INSTALLATION')
    const activeBoxes = myBoxes.filter(
        (b) => b.registrationStatus === 'ACTIVE' || !b.registrationStatus
    )

    return (
        <section aria-labelledby="boxes-heading" className="mt-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                        Hệ Thống Trạm Tủ Khóa Thông Minh
                    </p>
                    <h2 id="boxes-heading" className="text-xl font-extrabold text-white sm:text-2xl">
                        Tủ khóa của tôi & Đăng ký tủ mới
                    </h2>
                </div>
                <button
                    onClick={() => loadData()}
                    disabled={refreshing}
                    className="ui-button-secondary gap-1.5 px-3 py-1.5 text-xs font-semibold"
                    type="button"
                >
                    <RefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
                    Làm mới
                </button>
            </div>

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

            {/* 1. KHU VỰC: CÁC TỦ ĐANG CHỜ ADMIN XÉT DUYỆT & LẮP ĐẶT */}
            {pendingBoxes.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-amber-400 animate-pulse" />
                        <h3 className="text-sm font-extrabold text-amber-300 uppercase tracking-wide">
                            Tủ khóa đang chờ Admin xét duyệt & nghiệm thu lắp đặt ({pendingBoxes.length})
                        </h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {pendingBoxes.map((box) => (
                            <div
                                key={box.id || box.boxId}
                                className="relative overflow-hidden rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-950/80 p-5 shadow-[0_8px_25px_-5px_rgba(245,158,11,0.2)]"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <span className="font-mono text-xs font-bold text-amber-400">
                                            {box.boxId}
                                        </span>
                                        <h4 className="mt-1 text-base font-bold text-white">
                                            {box.name}
                                        </h4>
                                    </div>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-300 animate-pulse">
                                        <Clock size={12} /> Chờ duyệt lắp đặt
                                    </span>
                                </div>

                                {/* Banner địa chỉ đề xuất */}
                                <div className="mt-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
                                    <p className="flex items-start gap-1.5 text-amber-200 font-medium">
                                        <MapPin size={14} className="shrink-0 mt-0.5 text-amber-400" />
                                        <span>
                                            <strong className="text-white">Địa chỉ đề xuất:</strong>{' '}
                                            {box.requestedAddress}
                                        </span>
                                    </p>
                                    {box.requestedNote && (
                                        <p className="mt-1.5 text-slate-300 pl-5 text-[11px]">
                                            <em>Ghi chú vị trí:</em> "{box.requestedNote}"
                                        </p>
                                    )}
                                    <p className="mt-2 text-[10px] text-slate-500 font-mono pl-5">
                                        Gửi lúc: {formatDate(box.requestedAt || box.createdAt)}
                                    </p>
                                </div>

                                <p className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
                                    <Info size={13} className="text-cyan-400 shrink-0" />
                                    <span>
                                        Admin đang chuẩn hóa địa chỉ và gắn tọa độ GPS. Tủ sẽ kích hoạt ngay sau khi được nghiệm thu.
                                    </span>
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 2. KHU VỰC: CÁC TỦ KHÓA ĐANG HOẠT ĐỘNG (ACTIVE) CỦA OWNER */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wide flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        Tủ khóa đang hoạt động ({activeBoxes.length})
                    </h3>
                </div>

                {activeBoxes.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-slate-400">
                        <Box size={32} className="mx-auto mb-2 text-slate-500" />
                        <p className="text-sm font-medium">Bạn chưa có tủ khóa nào được kích hoạt.</p>
                        <p className="text-xs text-slate-500 mt-1">
                            Hãy chọn một tủ khóa có sẵn trong kho phía dưới để gửi yêu cầu lắp đặt.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {activeBoxes.map((box) => (
                            <div
                                key={box.id || box.boxId}
                                className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 transition hover:border-cyan-400/40 hover:shadow-[0_8px_30px_rgba(6,182,212,0.15)]"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <span className="font-mono text-xs font-bold text-cyan-300">
                                            {box.boxId}
                                        </span>
                                        <h4 className="mt-1 text-sm font-bold text-white line-clamp-1">
                                            {box.name}
                                        </h4>
                                    </div>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> Hoạt động
                                    </span>
                                </div>

                                <p className="mt-2.5 text-xs text-slate-300 flex items-start gap-1.5 leading-relaxed line-clamp-2">
                                    <MapPin size={13} className="shrink-0 mt-0.5 text-cyan-400" />
                                    <span>{box.address || 'Đang cập nhật địa chỉ'}</span>
                                </p>

                                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                                    <span className="text-slate-400">
                                        Số ngăn: <strong className="text-white">{box.totalCompartments || 12}</strong>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setQrModalBox(box)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
                                    >
                                        <QrCode size={13} /> Mã QR
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. KHU VỰC: DANH SÁCH TỦ CÓ SẴN TRONG KHO (AVAILABLE IN WAREHOUSE) */}
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-extrabold text-white uppercase tracking-wide flex items-center gap-2">
                            <Sparkles size={16} className="text-pink-400" />
                            Đăng ký Tủ khóa mới trong kho ({availableBoxes.length} tủ khả dụng)
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Chọn tủ khóa bên dưới, nhập địa chỉ đề xuất lắp đặt và gửi cho Admin xét duyệt
                        </p>
                    </div>
                </div>

                {availableBoxes.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-slate-400">
                        <Box size={32} className="mx-auto mb-2 text-slate-500" />
                        <p className="text-sm">Hiện tại kho đã hết tủ sẵn sàng. Vui lòng liên hệ Admin để bổ sung thêm tủ mới.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {availableBoxes.map((box) => (
                            <div
                                key={box.id || box.boxId}
                                className="flex flex-col justify-between rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/15 via-slate-900/40 to-slate-950/60 p-5 transition hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                            >
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs font-extrabold text-cyan-400">
                                            {box.boxId}
                                        </span>
                                        <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                                            Trong kho
                                        </span>
                                    </div>
                                    <h4 className="mt-2 text-base font-bold text-white">
                                        {box.name}
                                    </h4>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Kích thước tiêu chuẩn · {box.totalCompartments || 12} ngăn chứa thông minh
                                    </p>
                                </div>

                                <div className="mt-5 pt-3 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenRegisterModal(box)}
                                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-600 to-blue-600 py-2.5 text-xs font-extrabold text-white shadow-[0_0_15px_rgba(6,182,212,0.25)] transition hover:from-cyan-500 hover:to-blue-500 active:scale-98"
                                    >
                                        <Plus size={14} />
                                        Đăng ký lắp đặt tủ này
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Đăng Ký Lắp Đặt Tủ Khóa */}
            <Modal
                open={!!selectedBox}
                onClose={() => setSelectedBox(null)}
                title={`Đăng ký lắp đặt ${selectedBox?.name || ''}`}
                description="Điền thông tin địa chỉ mà bạn đề xuất lắp đặt tủ khóa để Admin tiến hành nghiệm thu"
                size="md"
            >
                {selectedBox && (
                    <form onSubmit={handleSubmitRegistration} className="space-y-4">
                        <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3.5 text-xs text-slate-300">
                            <p>
                                <strong>Mã tủ:</strong>{' '}
                                <span className="font-mono text-cyan-300 font-bold">{selectedBox.boxId}</span>
                            </p>
                            <p className="mt-1">
                                <strong>Số ngăn tủ:</strong> {selectedBox.totalCompartments || 12} ngăn
                            </p>
                        </div>

                        {/* TRƯỜNG BẮT BUỘC: ĐỊA CHỈ ĐỀ XUẤT LẮP ĐẶT */}
                        <div>
                            <label className="block text-xs font-bold text-white mb-1.5">
                                Địa chỉ mong muốn lắp đặt <span className="text-rose-400">* (Bắt buộc)</span>:
                            </label>
                            <textarea
                                rows={3}
                                required
                                value={requestedAddress}
                                onChange={(e) => {
                                    setRequestedAddress(e.target.value)
                                    if (e.target.value.trim().length >= 10) setAddressError('')
                                }}
                                placeholder="Ví dụ: Số 12 Đường 3/2, Phường Xuân Khánh, Quận Ninh Kiều, TP. Cần Thơ"
                                className={`w-full rounded-xl border bg-white/[0.04] p-3 text-xs text-white placeholder-slate-500 transition focus:outline-none ${
                                    addressError
                                        ? 'border-rose-500 focus:border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                                        : 'border-white/10 focus:border-cyan-400'
                                }`}
                            />
                            {addressError ? (
                                <p className="mt-1 text-xs text-rose-400 font-semibold flex items-center gap-1">
                                    <AlertCircle size={13} /> {addressError}
                                </p>
                            ) : (
                                <p className="mt-1 text-[11px] text-slate-400">
                                    * Tối thiểu 10 ký tự. Vui lòng ghi rõ số nhà, tên đường, phường/xã, quận/huyện.
                                </p>
                            )}
                        </div>

                        {/* TRƯỜNG TÙY CHỌN: GHI CHÚ VỊ TRÍ */}
                        <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1.5">
                                Ghi chú vị trí chi tiết (Tùy chọn):
                            </label>
                            <input
                                type="text"
                                value={requestedNote}
                                onChange={(e) => setRequestedNote(e.target.value)}
                                placeholder="Ví dụ: Cạnh cổng chính, bên hông nhà, có mái che che mưa nắng..."
                                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                            />
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setSelectedBox(null)}
                                className="ui-button-secondary px-4 py-2 text-xs font-bold"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2 text-xs font-extrabold text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] transition hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50"
                            >
                                {submitting ? 'Đang gửi yêu cầu...' : 'Xác nhận gửi yêu cầu đăng ký'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal Xem Mã QR của Box */}
            <Modal
                open={!!qrModalBox}
                onClose={() => setQrModalBox(null)}
                title={`Mã QR Tủ Khóa - ${qrModalBox?.name || ''}`}
                description="Mã QR công khai dán trên mặt tủ để shipper và khách vãng lai quét yêu cầu mở tủ"
                size="sm"
            >
                {qrModalBox && (
                    <div className="flex flex-col items-center justify-center p-3 text-center">
                        <div className="rounded-2xl border-2 border-cyan-400/40 bg-white p-3 shadow-[0_0_25px_rgba(6,182,212,0.2)]">
                            <img
                                src={
                                    qrModalBox.qrImageUrl ||
                                    `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                                        qrModalBox.qrUrl || `https://lockship-gamma.vercel.app/public/box-scan/${qrModalBox.boxId}`
                                    )}`
                                }
                                alt={`QR ${qrModalBox.boxId}`}
                                className="size-48 object-contain"
                            />
                        </div>
                        <p className="mt-3 font-mono text-sm font-extrabold text-cyan-300">
                            {qrModalBox.boxId}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            {qrModalBox.address}
                        </p>
                    </div>
                )}
            </Modal>
        </section>
    )
}
