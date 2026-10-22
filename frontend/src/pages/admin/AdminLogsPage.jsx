import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    Activity,
    RotateCw,
    Radio,
    Shield,
    Package,
    Unlock,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react'
import AdminPage from '../../components/AdminPage.jsx'
import Card from '../../components/ui/Card.jsx'
import ErrorMessage from '../../components/ErrorMessage.jsx'
import ModernActivityTimeline from '../../components/activity/ModernActivityTimeline.jsx'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import { adminApi } from '../../services/adminApi.js'
import { formatHumanActivityLog } from '../../utils/activityLogFormatter.js'
import { LOCKSHIP_BOXES } from '../../data/smartLockerBoxes.js'

export default function AdminLogsPage() {
    const [rawLogs, setRawLogs] = useState([])
    const [devices, setDevices] = useState([])
    const [users, setUsers] = useState([])
    const [deliveries, setDeliveries] = useState([])
    const [issues, setIssues] = useState([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const refresh = useCallback(async (isSilent = false) => {
        if (!isSilent) setError('')
        setRefreshing(true)
        try {
            const [allDevices, allUsers, allDeliveries, allIssues] = await Promise.all([
                adminApi.devices().catch(() => []),
                adminApi.users().catch(() => []),
                adminApi.deliveries().catch(() => []),
                adminApi.deliveryIssues().catch(() => []),
            ])

            setDevices(Array.isArray(allDevices) ? allDevices : [])
            setUsers(Array.isArray(allUsers) ? allUsers : [])
            setDeliveries(Array.isArray(allDeliveries) ? allDeliveries : [])
            setIssues(Array.isArray(allIssues) ? allIssues : [])

            // Fetch device MQTT logs
            const results = await Promise.allSettled(
                (Array.isArray(allDevices) ? allDevices : []).map(async (device) => ({
                    device,
                    logs: await adminApi.deviceLogs(device._id),
                }))
            )

            const deviceEntries = results
                .filter((r) => r.status === 'fulfilled')
                .flatMap((r) =>
                    (r.value.logs || []).map((log) => ({
                        ...log,
                        deviceId: r.value.device.deviceId,
                    }))
                )

            // Convert delivery milestones into activity stream items
            const deliveryEntries = (Array.isArray(allDeliveries) ? allDeliveries : []).flatMap((d) => {
                const items = []
                if (d.createdAt) {
                    items.push({
                        _id: `del-create-${d._id}`,
                        type: 'delivery_created',
                        deliveryId: d._id,
                        payload: { ownerId: d.ownerId, deliveryId: d._id },
                        createdAt: d.createdAt,
                    })
                }
                if (d.status === 'assigned' || d.shipperId) {
                    items.push({
                        _id: `del-assign-${d._id}`,
                        type: 'delivery_assigned',
                        deliveryId: d._id,
                        payload: { ownerId: d.ownerId, shipperId: d.shipperId, deliveryId: d._id },
                        createdAt: d.updatedAt || d.createdAt,
                    })
                }
                if (d.arrivedAt) {
                    items.push({
                        _id: `del-arrive-${d._id}`,
                        type: 'delivery_arrived',
                        deliveryId: d._id,
                        payload: { ownerId: d.ownerId, shipperId: d.shipperId, deliveryId: d._id },
                        createdAt: d.arrivedAt,
                    })
                }
                if (d.authorizedAt) {
                    items.push({
                        _id: `del-auth-${d._id}`,
                        type: 'delivery_authorized',
                        deliveryId: d._id,
                        payload: { ownerId: d.ownerId, shipperId: d.shipperId, deliveryId: d._id },
                        createdAt: d.authorizedAt,
                    })
                }
                if (d.completedAt || d.status === 'completed') {
                    items.push({
                        _id: `del-complete-${d._id}`,
                        type: 'delivery_completed',
                        deliveryId: d._id,
                        payload: { ownerId: d.ownerId, shipperId: d.shipperId, deliveryId: d._id },
                        createdAt: d.completedAt || d.updatedAt || d.createdAt,
                    })
                }
                if (d.status === 'cancelled') {
                    items.push({
                        _id: `del-cancel-${d._id}`,
                        type: 'delivery_cancelled',
                        deliveryId: d._id,
                        payload: { ownerId: d.ownerId, deliveryId: d._id },
                        createdAt: d.updatedAt || d.createdAt,
                    })
                }
                return items
            })

            // Convert issues into activity stream items
            const issueEntries = (Array.isArray(allIssues) ? allIssues : []).map((iss) => ({
                _id: `issue-${iss._id}`,
                type: 'issue_reported',
                deliveryId: iss.deliveryId,
                payload: {
                    ownerId: iss.ownerId,
                    shipperId: iss.shipperId,
                    category: iss.category,
                    description: iss.description,
                },
                createdAt: iss.createdAt,
            }))

            // Combined logs sorted chronologically
            const allEntries = [...deviceEntries, ...deliveryEntries, ...issueEntries].sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            )

            setRawLogs(allEntries)
        } catch (requestError) {
            setError(requestError.message || 'Không thể tổng hợp nhật ký hoạt động.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    // WebSocket real-time updates
    const onLiveEvent = useCallback(() => {
        refresh(true)
    }, [refresh])

    useSocketEvent('iot:status', onLiveEvent)
    useSocketEvent('iot:alert', onLiveEvent)
    useSocketEvent('unlock:success', onLiveEvent)
    useSocketEvent('unlock:failed', onLiveEvent)
    useSocketEvent('delivery:arrived', onLiveEvent)
    useSocketEvent('delivery:authorized', onLiveEvent)

    // Maps for fast lookups
    const userMap = useMemo(() => new Map(users.map((u) => [u._id, u])), [users])
    const deliveryMap = useMemo(() => new Map(deliveries.map((d) => [d._id, d])), [deliveries])
    const deviceMap = useMemo(() => {
        const map = new Map()
        for (const b of LOCKSHIP_BOXES) {
            map.set(b.id, b)
            map.set(b.code, b)
        }
        for (const dev of devices) {
            map.set(dev.deviceId, { name: `Lockship Box #${dev.deviceId}` })
        }
        return map
    }, [devices])

    // Transform into clean human-readable timeline items
    const humanLogs = useMemo(() => {
        return rawLogs.map((log) => formatHumanActivityLog(log, { userMap, deliveryMap, deviceMap }))
    }, [rawLogs, userMap, deliveryMap, deviceMap])

    return (
        <AdminPage
            eyebrow="Kiểm toán & Giám sát vận hành"
            title="Nhật ký hoạt động (Activity & Audit Logs)"
            description="Dòng thời gian trực quan ghi lại toàn bộ thao tác đóng/mở tủ khóa, trạng thái đơn hàng, đăng nhập và cảnh báo an ninh."
            action={
                <button
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-950/40 transition active:scale-95 disabled:opacity-50"
                    disabled={refreshing}
                    onClick={() => refresh()}
                    type="button"
                >
                    <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Đang làm mới...' : 'Làm mới nhật ký'}
                </button>
            }
        >
            {error && <ErrorMessage message={error} />}

            {/* Top Quick Status Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-xl">
                    <div className="flex items-center justify-between pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Tổng sự kiện
                        </span>
                        <Activity className="h-4 w-4 text-purple-400" />
                    </div>
                    <p className="text-2xl font-black text-white">{humanLogs.length}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Đã đồng bộ từ broker MQTT & CSDL</p>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 backdrop-blur-xl">
                    <div className="flex items-center justify-between pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                            Đóng / Mở khóa
                        </span>
                        <Unlock className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-black text-emerald-300">
                        {humanLogs.filter((l) => l.category === 'unlock').length}
                    </p>
                    <p className="text-[11px] text-emerald-500/80 mt-1">Lệnh xác thực an toàn</p>
                </div>

                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 backdrop-blur-xl">
                    <div className="flex items-center justify-between pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                            Vận hành đơn hàng
                        </span>
                        <Package className="h-4 w-4 text-blue-400" />
                    </div>
                    <p className="text-2xl font-black text-blue-300">
                        {humanLogs.filter((l) => l.category === 'order').length}
                    </p>
                    <p className="text-[11px] text-blue-500/80 mt-1">Tạo, phân công & giao vào tủ</p>
                </div>

                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 backdrop-blur-xl">
                    <div className="flex items-center justify-between pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                            Cảnh báo & Sự cố
                        </span>
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                    </div>
                    <p className="text-2xl font-black text-amber-300">
                        {humanLogs.filter((l) => ['warning', 'error', 'alert'].includes(l.category)).length}
                    </p>
                    <p className="text-[11px] text-amber-500/80 mt-1">Cảm biến rung & chốt khóa</p>
                </div>
            </div>

            {/* Modern Timeline Component */}
            <ModernActivityTimeline
                logs={humanLogs}
                isLoading={loading}
                onRefresh={() => refresh()}
            />
        </AdminPage>
    )
}