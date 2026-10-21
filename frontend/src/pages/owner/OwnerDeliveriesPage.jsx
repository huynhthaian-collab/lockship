import { useCallback, useEffect, useState } from 'react'
import OwnerPage from '../../components/OwnerPage.jsx'
import { OwnerError } from '../../components/OwnerFeedback.jsx'
import DeliveryList from '../../components/delivery/DeliveryList.jsx'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import { deliveryApi, shipperApi, vehicleApi } from '../../services/ownerApi.js'

export default function OwnerDeliveryPage() {
    const [deliveries, setDelivery] = useState([])
    const [shippers, setShipper] = useState([])
    const [vehicles, setVehicle] = useState([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const refresh = useCallback(async () => {
        setError('')
        try {
            const [deliveryRecords, shipperRecords, vehicleRecords] = await Promise.all([
                deliveryApi.list(),
                shipperApi.list(),
                vehicleApi.list(),
            ])
            setDelivery(deliveryRecords)
            setShipper(shipperRecords)
            setVehicle(vehicleRecords)
        } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
    }, [])
    useEffect(() => { refresh() }, [refresh])
    const onDeliveryChange = useCallback(() => { refresh() }, [refresh])
    useSocketEvent('delivery:arrived', onDeliveryChange)
    useSocketEvent('delivery:authorized', onDeliveryChange)
    useSocketEvent('unlock:success', onDeliveryChange)
    useSocketEvent('unlock:failed', onDeliveryChange)

    return (
        <OwnerPage eyebrow="Vận hành" title="Đơn giao hàng" description="Tạo, phân công và theo dõi tiến độ giao hàng." action="/owner/deliveries/create">
            <OwnerError error={error} onRetry={refresh} />
            <DeliveryList deliveries={deliveries} loading={loading} role="owner" shippers={shippers} statusOptions={['all', 'active', 'pending', 'assigned', 'accepted', 'in-progress', 'arrived', 'authorized', 'completed', 'cancelled']} vehicles={vehicles} />
        </OwnerPage>
    )
}