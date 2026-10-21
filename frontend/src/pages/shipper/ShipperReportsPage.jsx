import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Send } from 'lucide-react'
import ErrorMessage from '../../components/ErrorMessage.jsx'
import Loading from '../../components/Loading.jsx'
import ShipperPage from '../../components/ShipperPage.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import { OwnerNotice } from '../../components/OwnerFeedback.jsx'
import { shipperDeliveryApi } from '../../services/ownerApi.js'

const categories = [
    ['vehicle', 'Sự cố Phương tiện'],
    ['pickup', 'Sự cố Điểm lấy hàng'],
    ['delivery', 'Sự cố Địa chỉ giao hàng'],
    ['recipient', 'Không liên hệ được người nhận'],
    ['safety', 'Mối lo ngại về an toàn / Chốt khóa'],
    ['other', 'Vấn đề khác'],
]

export default function ShipperReportsPage() {
    const [issues, setIssues] = useState([])
    const [deliveries, setDelivery] = useState([])
    const [form, setForm] = useState({ deliveryId: '', category: 'other', description: '' })
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const submittingRef = useRef(false)

    const refresh = useCallback(async () => {
        setError('')
        try {
            const [reports, assigned] = await Promise.all([
                shipperDeliveryApi.listReports(),
                shipperDeliveryApi.list(),
            ])
            const safeReports = Array.isArray(reports) ? reports : []
            const safeAssigned = Array.isArray(assigned) ? assigned : []
            const activeDeliveries = safeAssigned.filter((item) => !['completed', 'cancelled'].includes(item?.status))
            setIssues(safeReports)
            setDelivery(activeDeliveries)
            setForm((current) => ({
                ...current,
                deliveryId: current.deliveryId || activeDeliveries[0]?._id || '',
            }))
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải danh sách báo cáo.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    async function submit(event) {
        event.preventDefault()
        if (submittingRef.current) return

        setError('')
        setNotice('')
        const description = form.description.trim()
        if (!form.deliveryId || description.length < 5 || description.length > 2000) {
            setError('Chọn đơn giao hàng đang hoạt động và mô tả sự cố trong 5–2000 ký tự.')
            return
        }

        submittingRef.current = true
        setSaving(true)
        try {
            await shipperDeliveryApi.reportProblem(form.deliveryId, { category: form.category, description })
            setNotice('Báo cáo sự cố đã được gửi đến chủ sở hữu đơn hàng.')
            setForm((current) => ({ ...current, description: '' }))
            await refresh()
        } catch (requestError) {
            setError(requestError.message || 'Không thể gửi báo cáo sự cố.')
        } finally {
            submittingRef.current = false
            setSaving(false)
        }
    }

    return (
        <ShipperPage eyebrow="Hỗ trợ & An toàn" title="Báo cáo sự cố vận hành" description="Gửi báo cáo sự cố giao hàng tức thì cho chủ sở hữu và theo dõi các cảnh báo đã ghi nhận trên hệ thống.">
            {error && <ErrorMessage message={error} />}
            {notice && <OwnerNotice>{notice}</OwnerNotice>}
            {loading ? <Loading label="Đang tải dữ liệu sự cố..." /> : (
                <div className="grid gap-6 xl:grid-cols-[minmax(20rem,0.85fr)_minmax(0,1.15fr)]">
                    <Card description="Ghi nhận sự cố phát sinh tại điểm lấy, điểm giao hoặc khóa xe" title="Gửi báo cáo mới">
                        <form className="space-y-4" onSubmit={submit}>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                                    Đơn giao hàng liên quan
                                </label>
                                <select
                                    className="ui-control mt-2 block w-full"
                                    onChange={(event) => setForm({ ...form, deliveryId: event.target.value })}
                                    required
                                    value={form.deliveryId}
                                >
                                    <option value="">Chọn đơn giao hàng</option>
                                    {deliveries.map((item) => (
                                        <option key={item._id} value={item._id}>
                                            {item._id ? item._id.slice(-8).toUpperCase() : ''} · {item.deliveryAddress}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                                    Danh mục sự cố
                                </label>
                                <select
                                    className="ui-control mt-2 block w-full"
                                    onChange={(event) => setForm({ ...form, category: event.target.value })}
                                    value={form.category}
                                >
                                    {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                                    Mô tả chi tiết sự cố
                                </label>
                                <textarea
                                    className="ui-control mt-2 block min-h-32 w-full"
                                    maxLength={2000}
                                    minLength={5}
                                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                                    placeholder="Mô tả cụ thể sự cố (vị trí tắc nghẽn, lỗi kết nối IoT, không tìm thấy người nhận...)"
                                    required
                                    value={form.description}
                                />
                            </div>
                            <p className="text-xs text-slate-400">
                                Báo cáo sẽ lập tức kích hoạt thông báo đỏ trên màn hình giám sát của chủ sở hữu.
                            </p>
                            <div className="pt-2">
                                {saving ? (
                                    <Loading label="Đang gửi báo cáo..." />
                                ) : (
                                    <button
                                        className="ui-button-primary min-h-12 w-full px-6"
                                        disabled={!deliveries.length}
                                        type="submit"
                                    >
                                        <Send size={16} />
                                        Gửi báo cáo cho chủ xe
                                    </button>
                                )}
                            </div>
                        </form>
                    </Card>

                    <Card description="Lịch sử các cảnh báo sự cố đã gửi" title="Danh sách báo cáo">
                        {issues.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-400">
                                Chưa có sự cố nào được ghi nhận. Toàn bộ chuyến giao hàng đang diễn ra bình thường.
                            </p>
                        ) : (
                            <ol className="divide-y divide-white/5">
                                {issues.map((issue) => {
                                    const deliveryCode = typeof issue.deliveryId === 'string'
                                        ? issue.deliveryId.slice(-8).toUpperCase()
                                        : (issue.deliveryId?._id || '').slice(-8).toUpperCase()
                                    const categoryLabel = (issue.category || '').replaceAll('_', ' ')
                                    return (
                                        <li className="py-4 first:pt-0 last:pb-0" key={issue._id}>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="grid size-7 place-items-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
                                                        <AlertTriangle size={14} />
                                                    </span>
                                                    <p className="text-sm font-semibold capitalize text-white">
                                                        {categoryLabel} {deliveryCode ? `· ${deliveryCode}` : ''}
                                                    </p>
                                                </div>
                                                <StatusPill value={issue.status} />
                                            </div>
                                            <p className="mt-2.5 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                                                {issue.description}
                                            </p>
                                            <p className="mt-2 font-mono text-xs text-slate-400">
                                                {new Date(issue.createdAt).toLocaleString('vi-VN')}
                                            </p>
                                        </li>
                                    )
                                })}
                            </ol>
                        )}
                    </Card>
                </div>
            )}
        </ShipperPage>
    )
}