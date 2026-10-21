import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    Terminal,
    Cpu,
    Search,
    Filter,
    RotateCw,
    Code,
    X,
    Clock,
    Radio,
    AlertCircle,
    CheckCircle2
} from 'lucide-react'
import AdminPage from '../../components/AdminPage.jsx'
import Card from '../../components/ui/Card.jsx'
import ErrorMessage from '../../components/ErrorMessage.jsx'
import Loading from '../../components/Loading.jsx'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import { adminApi } from '../../services/adminApi.js'

function getEventBadgeColor(type = '') {
    const t = type.toLowerCase()
    if (t.includes('alert') || t.includes('fail') || t.includes('error')) {
        return 'bg-rose-500/10 text-rose-300 border-rose-500/30'
    }
    if (t.includes('success') || t.includes('online')) {
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
    }
    if (t.includes('command')) {
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30'
    }
    if (t.includes('lock') || t.includes('unlock')) {
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
    }
    return 'bg-slate-500/10 text-slate-300 border-slate-500/30'
}

export default function AdminLogsPage() {
    const [logs, setLogs] = useState([])
    const [devices, setDevices] = useState([])
    const [filterType, setFilterType] = useState('all')
    const [filterDevice, setFilterDevice] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedLog, setSelectedLog] = useState(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const refresh = useCallback(async (isSilent = false) => {
        if (!isSilent) setError('')
        setRefreshing(true)
        try {
            const allDevices = await adminApi.devices()
            setDevices(Array.isArray(allDevices) ? allDevices : [])

            const results = await Promise.allSettled(
                (Array.isArray(allDevices) ? allDevices : []).map(async (device) => ({
                    device,
                    logs: await adminApi.deviceLogs(device._id),
                }))
            )

            const rejected = results.filter((result) => result.status === 'rejected')
            if (rejected.length && rejected.length === results.length) {
                throw rejected[0].reason
            }

            const entries = results
                .filter((result) => result.status === 'fulfilled')
                .flatMap((result) =>
                    (result.value.logs || []).map((log) => ({
                        ...log,
                        deviceId: result.value.device.deviceId,
                    }))
                )

            setLogs(
                entries
                    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
                    .slice(0, 500)
            )

            if (rejected.length && !isSilent) {
                setError(`Không thể truy cập ${rejected.length} luồng nhật ký thiết bị.`)
            }
        } catch (requestError) {
            setError(requestError.message || 'Không thể tổng hợp nhật ký')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        let active = true
        async function fetchInitial() {
            try {
                const allDevices = await adminApi.devices()
                if (!active) return
                setDevices(Array.isArray(allDevices) ? allDevices : [])

                const results = await Promise.allSettled(
                    (Array.isArray(allDevices) ? allDevices : []).map(async (device) => ({
                        device,
                        logs: await adminApi.deviceLogs(device._id),
                    }))
                )
                if (!active) return

                const entries = results
                    .filter((result) => result.status === 'fulfilled')
                    .flatMap((result) =>
                        (result.value.logs || []).map((log) => ({
                            ...log,
                            deviceId: result.value.device.deviceId,
                        }))
                    )

                setLogs(
                    entries
                        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
                        .slice(0, 500)
                )
            } catch (err) {
                if (active) setError(err.message || 'Lỗi kết nối nhật ký')
            } finally {
                if (active) setLoading(false)
            }
        }
        fetchInitial()
        return () => {
            active = false
        }
    }, [])

    // Live socket updates
    const onLiveEvent = useCallback(() => {
        refresh(true)
    }, [refresh])

    useSocketEvent('iot:status', onLiveEvent)
    useSocketEvent('iot:alert', onLiveEvent)
    useSocketEvent('unlock:success', onLiveEvent)
    useSocketEvent('unlock:failed', onLiveEvent)

    const eventTypes = useMemo(() => ['all', ...new Set(logs.map((log) => log.type || 'unknown'))].sort(), [logs])
    const deviceIds = useMemo(() => ['all', ...new Set(devices.map((d) => d.deviceId))], [devices])

    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            if (filterType !== 'all' && log.type !== filterType) return false
            if (filterDevice !== 'all' && log.deviceId !== filterDevice) return false

            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase()
                const dev = (log.deviceId || '').toLowerCase()
                const type = (log.type || '').toLowerCase()
                const topic = (log.topic || '').toLowerCase()
                const payloadStr = JSON.stringify(log.payload || {}).toLowerCase()

                if (!dev.includes(term) && !type.includes(term) && !topic.includes(term) && !payloadStr.includes(term)) {
                    return false
                }
            }
            return true
        })
    }, [logs, filterType, filterDevice, searchTerm])

    return (
        <AdminPage
            eyebrow="Nhật ký kiểm toán"
            title="Nhật ký IoT & Sự kiện hệ thống"
            description="Luồng kiểm toán thời gian thực: dữ liệu cảm biến MQTT, cảnh báo pin/rung chấn và lịch sử lệnh điều khiển."
            action={
                <button
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-200 backdrop-blur-md hover:bg-white/10 hover:text-white transition disabled:opacity-50"
                    disabled={refreshing}
                    onClick={() => refresh()}
                    type="button"
                >
                    <RotateCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
                    {refreshing ? 'Đang làm mới...' : 'Làm mới nhật ký'}
                </button>
            }
        >
            {error && <ErrorMessage message={error} />}

            {/* Filter and Search Bar */}
            <Card className="p-4 border-white/10 bg-slate-900/40">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-9 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none"
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Tìm nội dung, mã thiết bị hoặc chủ đề MQTT..."
                            value={searchTerm}
                        />
                        {searchTerm && (
                            <button
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                onClick={() => setSearchTerm('')}
                                type="button"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-400">Thiết bị:</span>
                            <select
                                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs font-mono text-white focus:border-purple-500/50 focus:outline-none"
                                onChange={(e) => setFilterDevice(e.target.value)}
                                value={filterDevice}
                            >
                                {deviceIds.map((dev) => (
                                    <option key={dev} value={dev}>
                                        {dev === 'all' ? 'Tất cả thiết bị' : dev}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-400">Sự kiện:</span>
                            <select
                                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs capitalize text-white focus:border-purple-500/50 focus:outline-none"
                                onChange={(e) => setFilterType(e.target.value)}
                                value={filterType}
                            >
                                {eventTypes.map((type) => (
                                    <option key={type} value={type}>
                                        {type === 'all' ? 'Tất cả sự kiện' : type.replaceAll('_', ' ')}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Logs Table */}
            {loading ? (
                <Loading label="Đang tổng hợp luồng nhật ký thiết bị..." />
            ) : filteredLogs.length === 0 ? (
                <Card className="p-12 text-center border-dashed border-white/10 bg-slate-900/20">
                    <Terminal className="mx-auto h-10 w-10 text-slate-600 mb-3" />
                    <p className="text-sm font-semibold text-slate-300">Không có nhật ký phù hợp</p>
                    <p className="text-xs text-slate-500 mt-1">Các sự kiện telemetry từ broker MQTT sẽ xuất hiện tự động tại đây</p>
                </Card>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                    <table className="w-full min-w-[65rem] text-left text-sm">
                        <thead className="border-b border-white/10 bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-slate-400">
                            <tr>
                                <th className="px-5 py-3.5">Thời gian</th>
                                <th className="px-5 py-3.5">Mã thiết bị</th>
                                <th className="px-5 py-3.5">Loại sự kiện</th>
                                <th className="px-5 py-3.5">Chủ đề MQTT</th>
                                <th className="px-5 py-3.5">Chi tiết gói tin</th>
                                <th className="px-5 py-3.5 text-right">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLogs.map((log) => {
                                const badgeClass = getEventBadgeColor(log.type)
                                const detailSummary =
                                    log.payload?.errorCode ||
                                    log.payload?.reason ||
                                    log.payload?.command ||
                                    log.payload?.event ||
                                    (log.payload ? JSON.stringify(log.payload) : '—')

                                return (
                                    <tr className="hover:bg-white/[0.02] transition" key={log._id}>
                                        <td className="whitespace-nowrap px-5 py-3 text-xs font-mono text-slate-400">
                                            {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '—'}
                                        </td>
                                        <td className="px-5 py-3 font-mono text-xs font-bold text-cyan-400">
                                            {log.deviceId}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
                                                {(log.type || 'unknown').replaceAll('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 font-mono text-xs text-slate-400">
                                            {log.topic || '—'}
                                        </td>
                                        <td className="max-w-md truncate px-5 py-3 text-xs text-slate-300 font-mono">
                                            {String(detailSummary)}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <button
                                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-white/10 hover:text-white transition"
                                                onClick={() => setSelectedLog(log)}
                                                type="button"
                                            >
                                                <Code className="h-3 w-3" />
                                                JSON
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Log Detail Modal */}
            {selectedLog && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
                    onClick={() => setSelectedLog(null)}
                >
                    <div
                        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl backdrop-blur-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-base font-bold text-white">Chi tiết bản ghi MQTT Telemetry</h3>
                                <p className="font-mono text-xs text-slate-400 mt-0.5">
                                    Thiết bị: <span className="text-cyan-400 font-bold">{selectedLog.deviceId}</span> • Sự kiện: {selectedLog.type}
                                </p>
                            </div>
                            <button
                                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
                                onClick={() => setSelectedLog(null)}
                                type="button"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-4 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-3.5">
                                <div>
                                    <span className="text-slate-400 font-semibold">Thời điểm:</span>
                                    <p className="mt-0.5 font-mono text-white">
                                        {selectedLog.createdAt ? new Date(selectedLog.createdAt).toLocaleString('vi-VN') : '—'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-semibold">Chủ đề (MQTT Topic):</span>
                                    <p className="mt-0.5 font-mono text-white break-all">
                                        {selectedLog.topic || 'Nội bộ'}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <span className="font-bold uppercase tracking-wider text-slate-300 text-[11px]">Payload dữ liệu</span>
                                <pre className="mt-2 max-h-80 overflow-auto rounded-xl border border-white/10 bg-slate-950 p-4 font-mono text-xs text-cyan-300 leading-relaxed">
                                    {JSON.stringify(selectedLog.payload ?? selectedLog, null, 2)}
                                </pre>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                className="rounded-xl border border-white/10 bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-bold text-white transition"
                                onClick={() => setSelectedLog(null)}
                                type="button"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminPage>
    )
}