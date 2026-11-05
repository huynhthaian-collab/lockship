import { useCallback, useEffect, useState } from 'react'
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Compass,
    MapPin,
    Navigation,
    Phone,
    RefreshCw,
    ShieldCheck,
    User,
    Zap,
} from 'lucide-react'
import Card from '../ui/Card.jsx'
import Modal from '../ui/Modal.jsx'
import Pagination from '../ui/Pagination.jsx'
import { boxApi } from '../../services/adminApi.js'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'

const CAN_THO_PRESETS = [
    { label: 'Ninh Kiều - Hòa Bình', lat: 10.0342, lng: 105.7831 },
    { label: 'Xuân Khánh - ĐH Cần Thơ', lat: 10.0299, lng: 105.7706 },
    { label: 'An Hòa - Nguyễn Văn Cừ', lat: 10.0451, lng: 105.7623 },
    { label: 'Hưng Lợi - Nguyễn Văn Linh', lat: 10.0218, lng: 105.7612 },
    { label: 'Cái Răng - Hưng Phú', lat: 10.0152, lng: 105.7854 },
]

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

export default function AdminBoxInstallationSection({ onActionCompleted }) {
    const [pendingBoxes, setPendingBoxes] = useState([])
    const [page, setPage] = useState(1)
    const PAGE_SIZE = 5
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    // Modal approval state
    const [approvalBox, setApprovalBox] = useState(null)
    const [address, setAddress] = useState('')
    const [lat, setLat] = useState('')
    const [lng, setLng] = useState('')
    const [adminNote, setAdminNote] = useState('')
    const [validationError, setValidationError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const loadPendingBoxes = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        setRefreshing(true)
        setError('')
        try {
            const boxes = await boxApi.listPendingInstallations()
            setPendingBoxes(boxes || [])
        } catch (err) {
            setError(err.message || 'Không thể tải danh sách yêu cầu lắp đặt.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        loadPendingBoxes()
    }, [loadPendingBoxes])

    // Real-time listener for new registration requests
    const onNewRequest = useCallback(() => {
        loadPendingBoxes(true)
    }, [loadPendingBoxes])

    useSocketEvent('box:registration_requested', onNewRequest)

    const handleOpenApprovalModal = (box) => {
        setApprovalBox(box)
        setAddress(box.requestedAddress || '')
        // Default to Can Tho coordinates preset if box has none
        setLat(box.location?.lat ? String(box.location.lat) : '10.0299')
        setLng(box.location?.lng ? String(box.location.lng) : '105.7706')
        setAdminNote('')
        setValidationError('')
    }

    const handleConfirmInstallation = async (e) => {
        e.preventDefault()
        const cleanAddress = address.trim()
        const numLat = parseFloat(lat)
        const numLng = parseFloat(lng)

        if (!cleanAddress || cleanAddress.length < 5) {
            setValidationError('Địa chỉ lắp đặt chính thức tối thiểu 5 ký tự.')
            return
        }

        if (Number.isNaN(numLat) || Number.isNaN(numLng)) {
            setValidationError('Vĩ độ (Latitude) và Kinh độ (Longitude) phải là số hợp lệ.')
            return
        }

        setSubmitting(true)
        setValidationError('')
        try {
            await boxApi.confirmInstallation(approvalBox.boxId || approvalBox._id, {
                address: cleanAddress,
                location: { lat: numLat, lng: numLng },
                note: adminNote.trim(),
            })

            setSuccessMessage(
                `Đã nghiệm thu và kích hoạt thành công tủ ${approvalBox.name} (${approvalBox.boxId})!`
            )
            setApprovalBox(null)
            loadPendingBoxes(true)
            if (onActionCompleted) onActionCompleted()
            setTimeout(() => setSuccessMessage(''), 8000)
        } catch (err) {
            setValidationError(err.message || 'Lỗi khi nghiệm thu lắp đặt tủ.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Card
            title={
                <div className="flex items-center gap-2">
                    <span className="text-amber-400">Yêu cầu Đăng ký & Nghiệm thu Lắp đặt Tủ Khóa</span>
                    {pendingBoxes.length > 0 && (
                        <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-xs font-bold text-amber-300 animate-pulse">
                            {pendingBoxes.length} chờ duyệt
                        </span>
                    )}
                </div>
            }
            description="Chủ tủ chọn đăng ký tủ trống trong kho và gửi địa chỉ đề xuất lắp đặt. Admin kiểm tra, chuẩn hóa địa chỉ và gắn tọa độ GPS chính thức để kích hoạt."
            action={
                <button
                    onClick={() => loadPendingBoxes()}
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

            {pendingBoxes.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                    <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400" />
                    <p className="text-sm font-semibold text-slate-300">
                        Không có yêu cầu đăng ký lắp đặt nào đang chờ duyệt
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        Khi có chủ tủ (`role: 'owner'`) đăng ký tủ mới, yêu cầu sẽ xuất hiện tại đây.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="divide-y divide-white/5">
                        {pendingBoxes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((box) => (
                        <div
                            key={box._id || box.boxId}
                            className="flex flex-col justify-between gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                        >
                            <div className="min-w-0 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs font-extrabold text-cyan-300">
                                        {box.boxId}
                                    </span>
                                    <span className="text-sm font-bold text-white">
                                        {box.name}
                                    </span>
                                    <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                        Chờ nghiệm thu
                                    </span>
                                </div>

                                {/* Owner info */}
                                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                                    <User size={13} className="text-slate-500" />
                                    <span>Chủ sở hữu:</span>
                                    <strong className="text-slate-200">
                                        {box.ownerId?.name || 'Chủ tủ'}
                                    </strong>
                                    {box.ownerId?.phone && (
                                        <span className="font-mono text-cyan-400">
                                            · {box.ownerId.phone}
                                        </span>
                                    )}
                                    {box.ownerId?.email && (
                                        <span className="text-slate-400 hidden sm:inline">
                                            ({box.ownerId.email})
                                        </span>
                                    )}
                                </p>

                                {/* Proposed Address */}
                                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-xs text-amber-200">
                                    <p className="flex items-start gap-1">
                                        <MapPin size={13} className="shrink-0 mt-0.5 text-amber-400" />
                                        <span>
                                            <strong>Địa chỉ đề xuất:</strong> {box.requestedAddress}
                                        </span>
                                    </p>
                                    {box.requestedNote && (
                                        <p className="mt-1 text-[11px] text-slate-300 pl-4">
                                            <em>Ghi chú:</em> "{box.requestedNote}"
                                        </p>
                                    )}
                                </div>

                                <p className="text-[10px] text-slate-500 font-mono">
                                    Thời gian gửi: {formatDate(box.requestedAt || box.createdAt)}
                                </p>
                            </div>

                            <div className="shrink-0">
                                <button
                                    type="button"
                                    onClick={() => handleOpenApprovalModal(box)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] transition hover:from-cyan-500 hover:to-blue-500 active:scale-95"
                                >
                                    <Compass size={14} /> Duyệt & Gắn Tọa độ GPS
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <Pagination
                    page={page}
                    pageCount={Math.ceil(pendingBoxes.length / PAGE_SIZE)}
                    total={pendingBoxes.length}
                    onChange={setPage}
                />
            </div>
        )}

            {/* Modal Duyệt & Gắn Tọa độ GPS */}
            <Modal
                open={!!approvalBox}
                onClose={() => setApprovalBox(null)}
                title={`Nghiệm thu Lắp đặt ${approvalBox?.name || ''}`}
                description="Chuẩn hóa địa chỉ và thiết lập tọa độ GPS chính thức để kích hoạt tủ khóa thông minh vào hệ thống"
                size="md"
            >
                {approvalBox && (
                    <form onSubmit={handleConfirmInstallation} className="space-y-4">
                        {validationError && (
                            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                                <AlertCircle size={15} />
                                <span>{validationError}</span>
                            </div>
                        )}

                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-slate-300 space-y-1">
                            <p>
                                <strong>Mã tủ:</strong>{' '}
                                <span className="font-mono text-cyan-300 font-bold">{approvalBox.boxId}</span>
                            </p>
                            <p>
                                <strong>Chủ sở hữu:</strong> {approvalBox.ownerId?.name || 'Owner'} (
                                {approvalBox.ownerId?.phone || 'Chưa có SĐT'})
                            </p>
                            <p>
                                <strong>Ghi chú từ Owner:</strong> {approvalBox.requestedNote || 'Không có'}
                            </p>
                        </div>

                        {/* Chuẩn hóa địa chỉ chính thức */}
                        <div>
                            <label className="block text-xs font-bold text-white mb-1">
                                Địa chỉ lắp đặt chính thức <span className="text-cyan-400">*</span>:
                            </label>
                            <input
                                type="text"
                                required
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Nhập địa chỉ chuẩn hóa (số nhà, đường, phường, quận)"
                                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                            />
                        </div>

                        {/* Tọa độ GPS (Lat / Lng) */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-white mb-1">
                                    Vĩ độ (Latitude) <span className="text-cyan-400">*</span>:
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={lat}
                                    onChange={(e) => setLat(e.target.value)}
                                    placeholder="Ví dụ: 10.0299"
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white mb-1">
                                    Kinh độ (Longitude) <span className="text-cyan-400">*</span>:
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={lng}
                                    onChange={(e) => setLng(e.target.value)}
                                    placeholder="Ví dụ: 105.7706"
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Gợi ý nhanh tọa độ Cần Thơ */}
                        <div>
                            <span className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                                Gợi ý nhanh tọa độ Cần Thơ:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {CAN_THO_PRESETS.map((preset) => (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => {
                                            setLat(String(preset.lat))
                                            setLng(String(preset.lng))
                                        }}
                                        className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-slate-300 hover:border-cyan-400/40 hover:bg-white/[0.08]"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Ghi chú Admin */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Ghi chú nghiệm thu (Tùy chọn):
                            </label>
                            <input
                                type="text"
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                placeholder="Ví dụ: Đã nghiệm thu phần cứng, kiểm tra kết nối IoT thành công"
                                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                            />
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setApprovalBox(null)}
                                className="ui-button-secondary px-4 py-2 text-xs font-bold"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-extrabold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
                            >
                                {submitting ? 'Đang kích hoạt...' : '✓ Xác nhận Nghiệm thu & Kích hoạt'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </Card>
    )
}

