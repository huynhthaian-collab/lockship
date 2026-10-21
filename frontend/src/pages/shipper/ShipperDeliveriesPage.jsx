import { useCallback, useEffect, useState } from 'react'
import { OwnerError } from '../../components/OwnerFeedback.jsx'
import ShipperPage from '../../components/ShipperPage.jsx'
import DeliveryList from '../../components/delivery/DeliveryList.jsx'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import { shipperDeliveryApi } from '../../services/ownerApi.js'

export default function ShipperDeliveryPage() {
    const [deliveries, setDelivery] = useState([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const refresh = useCallback(async () => {
        setError('')
        try { setDelivery(await shipperDeliveryApi.list()) } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
    }, [])
    useEffect(() => { refresh() }, [refresh])
    const onEvent = useCallback((event) => { if (!event?.deliveryId || deliveries.some((item) => item._id === event.deliveryId)) refresh() }, [deliveries, refresh])
    useSocketEvent('delivery:authorized', onEvent)
    useSocketEvent('unlock-code:created', onEvent)
    useSocketEvent('unlock:requested', onEvent)
    useSocketEvent('unlock:success', onEvent)
    useSocketEvent('unlock:failed', onEvent)

    return (
        <ShipperPage eyebrow="Danh sách công việc" title="Đơn giao hàng được phân công" description="Nhận phân công, cập nhật tiến độ từng đơn và xác nhận kết quả thiết bị trước khi hoàn tất.">
            <OwnerError error={error} onRetry={refresh} />
            <DeliveryList deliveries={deliveries} loading={loading} role="shipper" statusOptions={['active', 'all', 'assigned', 'accepted', 'in-progress', 'arrived', 'authorized', 'completed', 'cancelled']} />
        </ShipperPage>
    )
}