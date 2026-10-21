import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { History, Package, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import ErrorMessage from '../../components/ErrorMessage.jsx'
import Loading from '../../components/Loading.jsx'
import ShipperPage from '../../components/ShipperPage.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import { shipperDeliveryApi } from '../../services/ownerApi.js'

export default function ShipperHistoryPage() {
    const [deliveries, setDelivery] = useState([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        try {
            const data = await shipperDeliveryApi.list()
            const filtered = (Array.isArray(data) ? data : []).filter((item) =>
                ['completed', 'cancelled'].includes(item.status)
            )
            setDelivery(filtered)
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải lịch sử giao hàng')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        let active = true
        async function fetchInitial() {
            try {
                const data = await shipperDeliveryApi.list()
                if (active) {
                    const filtered = (Array.isArray(data) ? data : []).filter((item) =>
                        ['completed', 'cancelled'].includes(item.status)
                    )
                    setDelivery(filtered)
                }
            } catch (err) {
                if (active) setError(err.message || 'Lỗi kết nối máy chủ')
            } finally {
                if (active) setLoading(false)
            }
        }
        fetchInitial()
        return () => {
            active = false
        }
    }, [])

    return (
        <ShipperPage
            eyebrow="Lưu trữ & Thống kê"
            title="Lịch sử giao hàng"
            description="Tổng hợp tất cả các đơn hàng bạn đã giao thành công hoặc đã đóng."
        >
            {error && <ErrorMessage message={error} />}

            {loading ? (
                <Loading label="Đang tải lịch sử giao hàng..." />
            ) : deliveries.length === 0 ? (
                <Card className="p-12 text-center border-dashed border-white/10 bg-slate-900/20">
                    <History className="mx-auto h-10 w-10 text-slate-600 mb-3" />
                    <p className="text-sm font-semibold text-slate-300">Chưa có lịch sử giao hàng</p>
                    <p className="text-xs text-slate-500 mt-1">Các đơn hàng hoàn tất hoặc bị hủy sẽ được lưu trữ tại đây</p>
                </Card>
            ) : (
                <Card className="p-0 border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl overflow-hidden">
                    <div className="divide-y divide-white/5">
                        {deliveries.map((item) => (
                            <Link
                                className="flex flex-col gap-3 p-4 hover:bg-white/[0.03] transition sm:flex-row sm:items-center sm:justify-between sm:px-6"
                                key={item._id}
                                to={`/shipper/deliveries/${item._id}`}
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm font-bold text-cyan-400">
                                            #{item._id.slice(-8).toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-300">
                                        <span className="text-slate-400">Từ:</span> {item.pickupAddress} <br className="sm:hidden" />
                                        <span className="text-slate-400 sm:ml-2">Đến:</span> {item.deliveryAddress}
                                    </p>
                                    <p className="text-[11px] text-slate-500 font-mono">
                                        Hoàn tất: {item.completedAt ? new Date(item.completedAt).toLocaleString('vi-VN') : 'Không ghi nhận thời gian'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <StatusPill value={item.status} />
                                    <ArrowRight className="h-4 w-4 text-slate-500" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </Card>
            )}
        </ShipperPage>
    )
}