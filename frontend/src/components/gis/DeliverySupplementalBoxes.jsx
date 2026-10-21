import { useState, useMemo } from 'react'
import {
    Building2,
    User,
    Phone,
    CheckCircle2,
    ShieldCheck
} from 'lucide-react'
import Card from '../ui/Card.jsx'
import { LOCKSHIP_BOXES } from '../../data/smartLockerBoxes.js'

export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null
    const R = 6371 // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return parseFloat((R * c).toFixed(2))
}

export default function DeliverySupplementalBoxes({
    details = {},
    onChange,
    pickupCoords = null,
    deliveryCoords = null,
    selectedBox = null,
    onSelectBox,
}) {
    const [recipientInfo, setRecipientInfo] = useState({
        building: details.building || '',
        recipientName: details.recipientName || '',
        recipientPhone: details.recipientPhone || '',
    })

    const [boxConfig, setBoxConfig] = useState({
        size: details.boxSize || 'M',
        stationId: selectedBox?.id || details.stationId || 'box-04',
    })

    const [iotNotes, setIotNotes] = useState(details.iotNotes || '')

    const distance = useMemo(() => {
        if (pickupCoords?.lat && deliveryCoords?.lat) {
            return calculateDistanceKm(
                pickupCoords.lat,
                pickupCoords.lng,
                deliveryCoords.lat,
                deliveryCoords.lng
            )
        }
        return null
    }, [pickupCoords, deliveryCoords])

    const handleRecipientChange = (field, value) => {
        const next = { ...recipientInfo, [field]: value }
        setRecipientInfo(next)
        if (onChange) {
            onChange({
                ...details,
                ...next,
                boxSize: boxConfig.size,
                stationId: boxConfig.stationId,
                iotNotes,
                distanceKm: distance,
            })
        }
    }

    const handleBoxSizeSelect = (size) => {
        const next = { ...boxConfig, size }
        setBoxConfig(next)
        if (onChange) {
            onChange({
                ...details,
                ...recipientInfo,
                boxSize: size,
                stationId: next.stationId,
                iotNotes,
                distanceKm: distance,
            })
        }
    }

    const handleStationSelect = (stationId) => {
        const next = { ...boxConfig, stationId }
        setBoxConfig(next)
        const station = LOCKSHIP_BOXES.find((b) => b.id === stationId)
        if (onSelectBox && station) onSelectBox(station)
        if (onChange) {
            onChange({
                ...details,
                ...recipientInfo,
                boxSize: next.size,
                stationId,
                iotNotes,
                distanceKm: distance,
            })
        }
    }

    const handleNotesChange = (value) => {
        setIotNotes(value)
        if (onChange) {
            onChange({
                ...details,
                ...recipientInfo,
                boxSize: boxConfig.size,
                stationId: boxConfig.stationId,
                iotNotes: value,
                distanceKm: distance,
            })
        }
    }

    const currentStation = LOCKSHIP_BOXES.find((b) => b.id === (selectedBox?.id || boxConfig.stationId))

    return (
        <section className="grid gap-5 md:grid-cols-3" aria-label="3 Box thông tin bổ trợ">
            {/* BOX 1: Chi tiết điểm giao & Người nhận */}
            <Card className="p-5 border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-xl flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold text-xs">
                            1
                        </span>
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Chi tiết điểm nhận hàng</h3>
                            <p className="text-[10px] text-slate-400">Tòa nhà, căn hộ & Liên hệ</p>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                Tòa nhà / Tầng / Căn hộ
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                                    onChange={(e) => handleRecipientChange('building', e.target.value)}
                                    placeholder="Tầng 2, Tòa nhà Vincom, 209 Đường 30/4, Xuân Khánh, Ninh Kiều"
                                    value={recipientInfo.building}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                Tên người nhận
                            </label>
                            <div className="relative">
                                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                                    onChange={(e) => handleRecipientChange('recipientName', e.target.value)}
                                    placeholder="Họ và tên người nhận"
                                    value={recipientInfo.recipientName}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                Số điện thoại người nhận
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                                <input
                                    autoComplete="tel"
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                                    onChange={(e) => handleRecipientChange('recipientPhone', e.target.value)}
                                    placeholder="+84 901 234 567"
                                    value={recipientInfo.recipientPhone}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10">
                    <span className="text-[10px] text-slate-400">
                        Hệ thống sẽ gửi SMS/Email thông báo mã OTP khi hàng vào tủ.
                    </span>
                </div>
            </Card>

            {/* BOX 2: Chọn Hộc tủ & Kích thước Box (S / M / L) */}
            <Card className="p-5 border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-xl flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs">
                            2
                        </span>
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Chọn Hộc tủ / Box</h3>
                            <p className="text-[10px] text-slate-400">Kích cỡ & Trạm thông minh</p>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                                Trạm tủ khóa đích (Smart Locker Station)
                            </label>
                            <select
                                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500/50 focus:outline-none"
                                onChange={(e) => handleStationSelect(e.target.value)}
                                value={currentStation?.id || boxConfig.stationId}
                            >
                                {LOCKSHIP_BOXES.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name} ({b.status === 'Available' ? `${b.availableCompartments} hộc trống` : b.status})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                                Kích thước kiện hàng & Ngăn tủ
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { key: 'S', title: 'Size S', dim: '15×20×35 cm', desc: 'Tài liệu, ĐT' },
                                    { key: 'M', title: 'Size M', dim: '25×35×45 cm', desc: 'Giày dép, Quần áo' },
                                    { key: 'L', title: 'Size L', dim: '40×50×60 cm', desc: 'Điện tử, Nhiều gói' },
                                ].map((item) => {
                                    const active = boxConfig.size === item.key
                                    const availableCount = currentStation?.slots?.[item.key]?.available ?? 2
                                    return (
                                        <button
                                            className={`rounded-xl border p-2.5 text-center transition ${
                                                active
                                                    ? 'border-emerald-500/50 bg-emerald-500/15 shadow-lg shadow-emerald-950/30'
                                                    : 'border-white/10 bg-slate-950/50 hover:bg-white/5'
                                            }`}
                                            key={item.key}
                                            onClick={() => handleBoxSizeSelect(item.key)}
                                            type="button"
                                        >
                                            <p className={`text-xs font-black ${active ? 'text-emerald-400' : 'text-white'}`}>
                                                {item.title}
                                            </p>
                                            <p className="text-[9px] text-slate-400 mt-0.5">{item.dim}</p>
                                            <span className={`inline-block mt-1 text-[9px] font-bold ${availableCount > 0 ? 'text-emerald-300' : 'text-red-400'}`}>
                                                {availableCount > 0 ? `${availableCount} trống` : 'Hết hộc'}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Trạng thái trạm:</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        {currentStation?.status || 'Available'} · Pin: {currentStation?.battery || 95}%
                    </span>
                </div>
            </Card>

            {/* BOX 3: Tóm tắt Tọa độ & Ghi chú IoT */}
            <Card className="p-5 border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-xl flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-xs">
                            3
                        </span>
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white">GPS & Ghi chú IoT</h3>
                            <p className="text-[10px] text-slate-400">Tọa độ, khoảng cách & Bảo mật</p>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-xs space-y-1.5 font-mono">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Điểm lấy:</span>
                                <span className="font-bold text-cyan-400">
                                    {pickupCoords?.lat ? `${pickupCoords.lat.toFixed(4)}, ${pickupCoords.lng.toFixed(4)}` : 'Chờ ghim'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Điểm giao:</span>
                                <span className="font-bold text-emerald-400">
                                    {deliveryCoords?.lat ? `${deliveryCoords.lat.toFixed(4)}, ${deliveryCoords.lng.toFixed(4)}` : 'Chờ ghim'}
                                </span>
                            </div>
                            {distance != null && (
                                <div className="flex justify-between pt-1 border-t border-white/10">
                                    <span className="text-slate-300 font-sans">Khoảng cách tuyến:</span>
                                    <span className="font-bold text-amber-300">{distance} km</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                Ghi chú mã hóa cho IoT & Tài xế
                            </label>
                            <textarea
                                className="w-full rounded-xl border border-white/10 bg-slate-950/70 p-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none min-h-[64px]"
                                maxLength={500}
                                onChange={(e) => handleNotesChange(e.target.value)}
                                placeholder="Yêu cầu chụp ảnh bàn giao, hẹn giờ mở chốt..."
                                value={iotNotes}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-1.5 text-[10px] text-slate-400">
                    <ShieldCheck size={13} className="text-cyan-400 shrink-0" />
                    <span>Tọa độ và kích thước box được đồng bộ trực tiếp tới firmware IoT.</span>
                </div>
            </Card>
        </section>
    )
}
