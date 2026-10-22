import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    MapPin,
    Navigation,
    Sparkles,
    ArrowLeft,
    Compass,
    Package,
    ShieldCheck
} from 'lucide-react'
import ErrorMessage from '../../components/ErrorMessage.jsx'
import Loading from '../../components/Loading.jsx'
import OwnerPage from '../../components/OwnerPage.jsx'
import Card from '../../components/ui/Card.jsx'
import AddressAutocompleteInput from '../../components/gis/AddressAutocompleteInput.jsx'
import InteractiveMapPicker from '../../components/gis/InteractiveMapPicker.jsx'
import DeliverySupplementalBoxes, { calculateDistanceKm } from '../../components/gis/DeliverySupplementalBoxes.jsx'
import { deliveryApi } from '../../services/ownerApi.js'
import { LOCKSHIP_BOXES, reserveBoxCompartment, releaseBoxCompartment } from '../../data/smartLockerBoxes.js'

export default function OwnerDeliveryCreatePage() {
    const navigate = useNavigate()
    const [form, setForm] = useState({
        pickupAddress: '',
        deliveryAddress: '',
        description: '',
    })

    // GIS Coordinates State (Default: Ninh Kiều, Cần Thơ)
    const [pickupCoords, setPickupCoords] = useState({ lat: 10.0360, lng: 105.7818 })
    const [deliveryCoords, setDeliveryCoords] = useState({ lat: 10.0336, lng: 105.7882 })
    const [activeMapTarget, setActiveMapTarget] = useState('delivery') // 'pickup' | 'delivery'

    // 3 Supplemental Boxes State
    const [supplemental, setSupplemental] = useState({
        building: '',
        recipientName: '',
        recipientPhone: '',
        boxSize: 'M',
        stationId: 'box-04',
        iotNotes: '',
        distanceKm: null,
    })

    const [selectedBox, setSelectedBox] = useState(LOCKSHIP_BOXES[0])
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const submittingRef = useRef(false)

    // Handle Pickup Address and Coords selection
    const handlePickupSelect = (loc) => {
        setForm((prev) => ({ ...prev, pickupAddress: loc.address }))
        if (loc.lat && loc.lng) {
            setPickupCoords({ lat: loc.lat, lng: loc.lng })
        }
    }

    // Handle Delivery Address and Coords selection
    const handleDeliverySelect = (loc) => {
        setForm((prev) => ({ ...prev, deliveryAddress: loc.address }))
        if (loc.lat && loc.lng) {
            setDeliveryCoords({ lat: loc.lat, lng: loc.lng })
        }
        if (loc.box) {
            setSelectedBox(loc.box)
            setSupplemental((prev) => ({ ...prev, stationId: loc.box.id }))
        }
    }

    // Handle Location Change directly from Map (Drag or Click)
    const handleMapLocationChange = (loc) => {
        if (activeMapTarget === 'pickup') {
            setPickupCoords({ lat: loc.lat, lng: loc.lng })
            if (loc.address) {
                setForm((prev) => ({ ...prev, pickupAddress: loc.address }))
            }
        } else {
            setDeliveryCoords({ lat: loc.lat, lng: loc.lng })
            if (loc.address) {
                setForm((prev) => ({ ...prev, deliveryAddress: loc.address }))
            }
        }
        if (loc.box) {
            setSelectedBox(loc.box)
            setSupplemental((prev) => ({ ...prev, stationId: loc.box.id }))
        }
    }

    const handleBoxSelect = (box) => {
        setSelectedBox(box)
        setForm((prev) => ({ ...prev, deliveryAddress: box.address }))
        setDeliveryCoords({ lat: box.lat, lng: box.lon })
        setSupplemental((prev) => ({ ...prev, stationId: box.id }))
        setActiveMapTarget('delivery')
    }

    async function submit(event) {
        event.preventDefault()
        if (submittingRef.current) return

        setError('')
        const pickupAddress = form.pickupAddress.trim()
        const deliveryAddress = form.deliveryAddress.trim()

        if (pickupAddress.length < 3 || pickupAddress.length > 500) {
            setError('Địa chỉ lấy hàng phải từ 3–500 ký tự và đã được định vị.')
            return
        }
        if (deliveryAddress.length < 3 || deliveryAddress.length > 500) {
            setError('Địa chỉ giao hàng phải từ 3–500 ký tự và đã được định vị.')
            return
        }

        // 1. Kiểm tra tọa độ bản đồ GIS
        if (!pickupCoords?.lat || !pickupCoords?.lng || !deliveryCoords?.lat || !deliveryCoords?.lng) {
            setError('Vui lòng xác thực vị trí tọa độ trên bản đồ cho cả điểm lấy và điểm giao hàng.')
            return
        }

        // 2. Kiểm tra thông tin người nhận chuẩn định dạng
        const recipientName = supplemental.recipientName?.trim()
        if (!recipientName || recipientName.length < 2) {
            setError('Vui lòng nhập họ tên người nhận hợp lệ (tối thiểu 2 ký tự).')
            return
        }

        const rawPhone = supplemental.recipientPhone?.trim().replace(/[\s.-]+/g, '')
        const phoneRegex = /^(0|\+84)[35789]\d{8}$/
        if (!rawPhone || !phoneRegex.test(rawPhone)) {
            setError('Số điện thoại người nhận không đúng định dạng chuẩn Việt Nam (Ví dụ: 0901234567 hoặc +84901234567).')
            return
        }

        // 3. Kiểm tra tính sẵn sàng của Tủ khóa (Smart Locker Box)
        if (!selectedBox) {
            setError('Vui lòng chọn Tủ khóa thông minh (Lockship Box) cho đơn hàng.')
            return
        }

        if (selectedBox.status === 'Locked' || (selectedBox.availableCompartments !== undefined && selectedBox.availableCompartments <= 0)) {
            setError(`Tủ khóa "${selectedBox.name}" hiện đã hết hộc trống hoặc đang bảo trì. Vui lòng chọn Box khác!`)
            return
        }

        if (selectedBox.isOnline === false) {
            setError(`Tủ khóa "${selectedBox.name}" hiện đang ngoại tuyến (Offline). Vui lòng chọn trạm đang hoạt động.`)
            return
        }

        // Calculate final distance
        const distance = calculateDistanceKm(
            pickupCoords.lat,
            pickupCoords.lng,
            deliveryCoords.lat,
            deliveryCoords.lng
        )

        // Build structured metadata safely inside description (max 2000 chars)
        const metadataParts = [
            form.description.trim() ? `Ghi chú: ${form.description.trim()}` : null,
            supplemental.building ? `Tòa nhà/Căn hộ: ${supplemental.building}` : null,
            `Người nhận: ${recipientName} (${rawPhone})`,
            `Hộc tủ: Size ${supplemental.boxSize || 'M'} · Trạm: ${selectedBox?.name || supplemental.stationId}`,
            `GPS Lấy: ${pickupCoords.lat.toFixed(5)}, ${pickupCoords.lng.toFixed(5)}`,
            `GPS Giao: ${deliveryCoords.lat.toFixed(5)}, ${deliveryCoords.lng.toFixed(5)}`,
            distance ? `Khoảng cách tuyến: ~${distance} km` : null,
            supplemental.iotNotes ? `Chỉ dẫn IoT: ${supplemental.iotNotes}` : null,
        ].filter(Boolean)

        const finalDescription = metadataParts.join(' | ').slice(0, 2000)

        submittingRef.current = true
        setSaving(true)
        try {
            // Giữ chỗ hộc tủ an toàn để tránh xung đột đơn hàng
            reserveBoxCompartment(selectedBox.id, supplemental.boxSize || 'M')

            const delivery = await deliveryApi.create({
                pickupAddress,
                deliveryAddress,
                description: finalDescription,
            })
            if (delivery?._id) {
                navigate(`/owner/deliveries/${delivery._id}`, { replace: true })
            } else {
                navigate('/owner/deliveries', { replace: true })
            }
        } catch (requestError) {
            // Hoàn lại slot nếu lỗi
            try {
                releaseBoxCompartment(selectedBox.id, supplemental.boxSize || 'M')
            } catch {
                // ignore
            }
            setError(requestError.message || 'Không thể tạo đơn giao hàng.')
        } finally {
            submittingRef.current = false
            setSaving(false)
        }
    }

    return (
        <OwnerPage
            eyebrow="Vận hành & Lộ trình thông minh"
            title="Khởi tạo đơn giao hàng & Bản đồ GIS"
            description="Tích hợp kiểm tra địa chỉ thực tế (Nominatim), bản đồ định vị 2 chiều và cấu hình hộc tủ Smart Locker."
        >
            <Link
                className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
                to="/owner/deliveries"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Quay lại danh sách đơn hàng
            </Link>

            {error && <ErrorMessage message={error} />}

            <form className="mt-2 space-y-6" onSubmit={submit}>
                {/* Main Card: Route & Interactive GIS Map */}
                <Card className="p-6 border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/10">
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <Navigation className="h-4 w-4 text-cyan-400" />
                                Tuyến đường & Tọa độ giao nhận
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Tự động gợi ý địa chỉ chuẩn Việt Nam và đồng bộ vị trí trực tiếp lên bản đồ
                            </p>
                        </div>

                        {/* Map Mode Toggle */}
                        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/70 p-1">
                            <button
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                    activeMapTarget === 'pickup'
                                        ? 'bg-cyan-500 text-slate-950 shadow-md'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                                onClick={() => setActiveMapTarget('pickup')}
                                type="button"
                            >
                                📍 Điểm lấy hàng
                            </button>
                            <button
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                    activeMapTarget === 'delivery'
                                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                                onClick={() => setActiveMapTarget('delivery')}
                                type="button"
                            >
                                🎯 Điểm giao hàng
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-6 lg:grid-cols-2">
                        {/* Left column: Address Autocompletes */}
                        <div className="space-y-5">
                            {/* Pickup Address Input with Autocomplete */}
                            <div
                                className={`p-4 rounded-2xl border transition ${
                                    activeMapTarget === 'pickup'
                                        ? 'border-cyan-500/40 bg-cyan-500/[0.04]'
                                        : 'border-white/10 bg-slate-950/40'
                                }`}
                                onClick={() => setActiveMapTarget('pickup')}
                            >
                                <AddressAutocompleteInput
                                    icon={MapPin}
                                    iconColor="text-cyan-400"
                                    label="1. Địa chỉ lấy hàng (Kho hàng / Điểm xuất phát)"
                                    onChange={(addr) => setForm((prev) => ({ ...prev, pickupAddress: addr }))}
                                    onSelectLocation={handlePickupSelect}
                                    placeholder="Ví dụ: Kho tổng Lockship, 1 Đại lộ Hòa Bình, Tân An, Ninh Kiều, Cần Thơ"
                                    required
                                    value={form.pickupAddress}
                                    verifiedCoords={pickupCoords}
                                />
                            </div>

                            {/* Delivery Address Input with Autocomplete */}
                            <div
                                className={`p-4 rounded-2xl border transition ${
                                    activeMapTarget === 'delivery'
                                        ? 'border-emerald-500/40 bg-emerald-500/[0.04]'
                                        : 'border-white/10 bg-slate-950/40'
                                }`}
                                onClick={() => setActiveMapTarget('delivery')}
                            >
                                <AddressAutocompleteInput
                                    icon={Navigation}
                                    iconColor="text-emerald-400"
                                    label="2. Địa chỉ giao hàng (Tòa nhà / Trạm Smart Locker)"
                                    onChange={(addr) => setForm((prev) => ({ ...prev, deliveryAddress: addr }))}
                                    onSelectLocation={handleDeliverySelect}
                                    placeholder="Ví dụ: Số 2 Hai Bà Trưng, Tân An, Ninh Kiều, Cần Thơ (Bến Ninh Kiều)"
                                    required
                                    value={form.deliveryAddress}
                                    verifiedCoords={deliveryCoords}
                                />
                            </div>

                            {/* Quick Select Smart Locker Stations */}
                            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                        <Package className="h-3.5 w-3.5 text-cyan-400" />
                                        Trạm Smart Locker có sẵn (Chọn nhanh)
                                    </span>
                                    <span className="text-[10px] text-slate-400">3 Box khả dụng</span>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-3">
                                    {LOCKSHIP_BOXES.map((box) => {
                                        const isSelected = selectedBox?.id === box.id
                                        return (
                                            <button
                                                className={`rounded-xl border p-2.5 text-left transition ${
                                                    isSelected
                                                        ? 'border-cyan-500/50 bg-cyan-500/10 shadow-lg'
                                                        : 'border-white/10 bg-slate-900/60 hover:bg-white/5'
                                                }`}
                                                key={box.id}
                                                onClick={() => handleBoxSelect(box)}
                                                type="button"
                                            >
                                                <p className="text-xs font-bold text-white truncate">{box.name.split('(')[0]}</p>
                                                <p className="text-[10px] text-slate-400 truncate mt-0.5">{box.address}</p>
                                                <div className="flex items-center justify-between mt-1 text-[9px]">
                                                    <span className={box.status === 'Available' ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                                                        {box.status}
                                                    </span>
                                                    <span className="text-cyan-300 font-mono">{box.availableCompartments} trống</span>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Right column: Interactive Map Canvas */}
                        <div>
                            <div className="mb-2 flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                                    <Compass className="h-4 w-4 text-cyan-400" />
                                    Bản đồ tương tác (Đang định vị: {activeMapTarget === 'pickup' ? 'Điểm lấy' : 'Điểm giao'})
                                </span>
                                <span className="text-[11px] text-slate-400">
                                    {activeMapTarget === 'pickup' ? 'Ghim màu Xanh Cyan' : 'Ghim màu Xanh Lá'}
                                </span>
                            </div>

                            <InteractiveMapPicker
                                height="380px"
                                label={activeMapTarget === 'pickup' ? 'Điểm lấy hàng' : 'Điểm giao hàng'}
                                lat={activeMapTarget === 'pickup' ? pickupCoords.lat : deliveryCoords.lat}
                                lng={activeMapTarget === 'pickup' ? pickupCoords.lng : deliveryCoords.lng}
                                onLocationChange={handleMapLocationChange}
                                onSelectBox={handleBoxSelect}
                                selectedBoxId={selectedBox?.id}
                                showBoxes={true}
                                zoom={14}
                            />
                        </div>
                    </div>
                </Card>

                {/* 3 Supplemental Boxes Component */}
                <DeliverySupplementalBoxes
                    deliveryCoords={deliveryCoords}
                    details={supplemental}
                    onChange={(updated) => setSupplemental(updated)}
                    onSelectBox={handleBoxSelect}
                    pickupCoords={pickupCoords}
                    selectedBox={selectedBox}
                />

                {/* Notes & Submit Bar */}
                <Card className="p-6 border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                            Ghi chú đơn hàng bổ sung <span className="font-normal text-slate-500">(Không bắt buộc)</span>
                        </label>
                        <textarea
                            className="w-full rounded-xl border border-white/10 bg-slate-950/70 p-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none min-h-[72px]"
                            maxLength={1000}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="Ghi chú kiện hàng dễ vỡ, hướng dẫn nhận hàng hoặc yêu cầu bảo mật đặc biệt..."
                            value={form.description}
                        />
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            <span>Đơn hàng sẽ được mã hóa và tạo mã OTP khi tài xế đến trạm.</span>
                        </div>

                        {saving ? (
                            <Loading label="Đang khởi tạo đơn hàng..." />
                        ) : (
                            <button
                                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-7 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-950/40 transition active:scale-95 disabled:opacity-50"
                                disabled={saving}
                                type="submit"
                            >
                                <Sparkles size={16} />
                                Khởi tạo đơn giao hàng bảo mật IoT
                            </button>
                        )}
                    </div>
                </Card>
            </form>
        </OwnerPage>
    )
}