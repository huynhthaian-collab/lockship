import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import OwnerPage from '../../components/OwnerPage.jsx'
import { OwnerError, OwnerLoading } from '../../components/OwnerFeedback.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import IsometricLocker from '../../components/spatial/IsometricLocker.jsx'
import SpatialTiltCard from '../../components/spatial/SpatialTiltCard.jsx'
import ModernActivityTimeline from '../../components/activity/ModernActivityTimeline.jsx'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import { deviceApi } from '../../services/ownerApi.js'

function formatDate(value) { return value ? new Date(value).toLocaleString('vi-VN') : '—' }

export default function OwnerLockDetailPage() {
    const { id } = useParams()
    const [device, setDevice] = useState(null)
    const [logs, setLogs] = useState([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const refresh = useCallback(async () => {
        setError('')
        try {
            const [record, status, eventLogs] = await Promise.all([deviceApi.get(id), deviceApi.status(id), deviceApi.logs(id)])
            setDevice({ ...record, ...status })
            setLogs(eventLogs)
        } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
    }, [id])
    useEffect(() => { refresh() }, [refresh])
    const onStatus = useCallback((event) => {
        if (event.deviceId === device?.deviceId) setDevice((current) => ({ ...current, ...event }))
    }, [device?.deviceId])
    const onAlert = useCallback((event) => {
        if (event.deviceId === device?.deviceId) refresh()
    }, [device?.deviceId, refresh])
    useSocketEvent('iot:status', onStatus)
    useSocketEvent('iot:alert', onAlert)

    if (loading) return <OwnerLoading label="Đang tải trạng thái khóa" />

    return (
        <OwnerPage eyebrow="Thiết bị đã kết nối" title={device?.deviceId || 'Chi tiết khóa'} description="Trạng thái thiết bị trực tiếp và hoạt động gần đây. Không thể gửi lệnh mở khóa tại đây.">
            <Link className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400 no-underline transition hover:text-cyan-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" to="/owner/locks">
                ← Quay lại danh sách khóa
            </Link>
            <OwnerError error={error} onRetry={refresh} />
            {device && (
                <div className="space-y-6">
                    {/* 3D Spatial Holographic Stage */}
                    <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
                        <SpatialTiltCard className="flex flex-col items-center justify-center p-6 text-center" glareColor="rgba(59, 130, 246, 0.3)">
                            <div className="mb-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold text-cyan-300">
                                    <span className="size-1.5 animate-pulse rounded-full bg-cyan-400" />
                                    Mô phỏng cơ điện tử 3D
                                </span>
                            </div>
                            <div className="py-6">
                                <IsometricLocker
                                    battery={device.battery ?? 100}
                                    className="scale-110 sm:scale-125"
                                    deviceId={device.deviceId}
                                    lockStatus={device.lockStatus}
                                    status={device.status}
                                />
                            </div>
                            <p className="mt-2 text-xs text-slate-400">
                                Phản hồi cơ điện tử tức thì khi thiết bị IoT đồng bộ tín hiệu
                            </p>
                        </SpatialTiltCard>

                        <Card description="Dữ liệu cảm biến và kết nối viễn thông" title="Thông số kỹ thuật thiết bị">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Trạng thái kết nối</p>
                                    <div className="mt-2.5"><StatusPill value={device.status} /></div>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Chốt khóa vật lý</p>
                                    <div className="mt-2.5"><StatusPill value={device.lockStatus} /></div>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Dung lượng pin còn lại</p>
                                    <p className="mt-1.5 font-mono text-xl font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                                        {device.battery == null ? '—' : `${device.battery}%`}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Phiên bản Firmware</p>
                                    <p className="mt-1.5 font-mono text-sm font-semibold text-slate-200">
                                        {device.firmwareVersion || 'v1.0.0-release'}
                                    </p>
                                </div>
                                <div className="sm:col-span-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Thời gian nhận gói tin gần nhất</p>
                                    <p className="mt-1.5 text-sm font-medium text-slate-200">
                                        {formatDate(device.lastSeen)}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <Card description="Lịch sử các lần đóng mở, cảm biến và trạng thái của khóa thông minh" title="Lịch sử viễn thám & Hoạt động thời gian thực">
                        <ModernActivityTimeline
                            emptyDescription="Các sự kiện đóng mở khóa, pin và cảnh báo sẽ xuất hiện tại đây ngay khi thiết bị phát sinh hoạt động."
                            emptyMessage="Chưa ghi nhận sự kiện nào cho thiết bị khóa này"
                            logs={logs.map((log) => ({ ...log, deviceId: log.deviceId || device.deviceId }))}
                        />
                    </Card>
                </div>
            )}
        </OwnerPage>
    )
}