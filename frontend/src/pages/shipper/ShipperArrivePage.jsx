import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MapPin, Navigation, Radio } from 'lucide-react'
import ErrorMessage from '../../components/ErrorMessage.jsx'
import Loading from '../../components/Loading.jsx'
import ShipperPage from '../../components/ShipperPage.jsx'
import Card from '../../components/ui/Card.jsx'
import SpatialTiltCard from '../../components/spatial/SpatialTiltCard.jsx'
import { shipperDeliveryApi } from '../../services/ownerApi.js'

export default function ShipperArrivePage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [delivery, setDelivery] = useState(null)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const confirmingRef = useRef(false)

    const refresh = useCallback(async () => {
        try {
            const data = await shipperDeliveryApi.get(id)
            setDelivery(data)
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải thông tin địa chỉ giao hàng.')
        }
    }, [id])

    useEffect(() => {
        refresh()
    }, [refresh])

    async function confirmArrival() {
        if (confirmingRef.current) return
        confirmingRef.current = true
        setSaving(true)
        setError('')
        try {
            await shipperDeliveryApi.arrive(id)
            navigate(`/shipper/deliveries/${id}`, { replace: true })
        } catch (requestError) {
            setError(requestError.message || 'Không thể ghi nhận đã đến nơi.')
        } finally {
            confirmingRef.current = false
            setSaving(false)
        }
    }

    if (!delivery && !error) return <Loading label="Đang tải địa chỉ giao hàng" />

    return (
        <ShipperPage eyebrow="Bàn giao đơn hàng" title="Xác nhận đã đến nơi" description="Thông báo tức thời cho chủ sở hữu rằng bạn đã có mặt tại điểm giao hàng để kích hoạt quy trình cấp mã.">
            <Link className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400 no-underline transition hover:text-cyan-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" to={`/shipper/deliveries/${id}`}>
                ← Quay lại chi tiết đơn
            </Link>
            {error && <ErrorMessage message={error} />}
            {delivery && (
                <div className="max-w-2xl space-y-6">
                    <SpatialTiltCard className="p-6 text-center" glareColor="rgba(16, 185, 129, 0.25)">
                        {/* Radar wave micro-animation */}
                        <div className="relative mx-auto my-4 flex size-24 items-center justify-center">
                            <span className="absolute size-24 animate-ping rounded-full bg-emerald-500/20" />
                            <span className="absolute size-16 animate-pulse rounded-full bg-emerald-500/30" />
                            <div className="relative grid size-14 place-items-center rounded-2xl border border-emerald-400/40 bg-emerald-500/20 text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.4)]">
                                <MapPin size={28} />
                            </div>
                        </div>

                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                            <Radio className="size-3.5 animate-pulse text-emerald-400" />
                            Định vị trạm giao hàng
                        </span>

                        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Địa chỉ điểm đến</p>
                            <p className="mt-1.5 text-base font-semibold text-white">{delivery.deliveryAddress}</p>
                        </div>

                        <p className="mt-4 text-xs leading-relaxed text-slate-400">
                            Chỉ bấm xác nhận khi bạn đã thực tế có mặt tại vị trí của người nhận. Sau khi xác nhận, hệ thống sẽ gửi thông báo đến chủ sở hữu để xét duyệt cấp quyền mở khóa IoT.
                        </p>

                        <div className="mt-6 flex justify-center">
                            {saving ? (
                                <Loading label="Đang truyền tín hiệu đã đến nơi..." />
                            ) : (
                                <button
                                    className="ui-button-primary min-h-12 w-full sm:w-auto px-8"
                                    disabled={delivery.status !== 'in-progress' || saving}
                                    onClick={confirmArrival}
                                    type="button"
                                >
                                    <Navigation size={18} />
                                    Tôi đã đến nơi an toàn
                                </button>
                            )}
                        </div>

                        {delivery.status !== 'in-progress' && (
                            <p className="mt-4 text-xs font-medium text-amber-400/90">
                                ⚠ Đơn giao hàng hiện không trong trạng thái "Đang thực hiện".
                            </p>
                        )}
                    </SpatialTiltCard>
                </div>
            )}
        </ShipperPage>
    )
}