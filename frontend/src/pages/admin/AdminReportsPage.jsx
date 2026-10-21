import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Search,
    RotateCw,
    X,
    FileText
} from 'lucide-react'
import AdminPage from '../../components/AdminPage.jsx'
import Card from '../../components/ui/Card.jsx'
import ErrorMessage from '../../components/ErrorMessage.jsx'
import Loading from '../../components/Loading.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import { adminApi } from '../../services/adminApi.js'

export default function AdminReportsPage() {
    const [issues, setIssues] = useState([])
    const [users, setUser] = useState([])
    const [deliveries, setDelivery] = useState([])
    const [filter, setFilter] = useState('all')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedIssue, setSelectedIssue] = useState(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        setError('')
        try {
            const [issueList, userList, deliveryList] = await Promise.all([
                adminApi.reports(),
                adminApi.users().catch(() => []),
                adminApi.deliveries().catch(() => []),
            ])
            setIssues(Array.isArray(issueList) ? issueList : [])
            setUser(Array.isArray(userList) ? userList : [])
            setDelivery(Array.isArray(deliveryList) ? deliveryList : [])
        } catch (requestError) {
            setError(requestError.message || 'Không thể tải báo cáo sự cố')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        let active = true
        async function fetchInitial() {
            try {
                const [issueList, userList, deliveryList] = await Promise.all([
                    adminApi.reports(),
                    adminApi.users().catch(() => []),
                    adminApi.deliveries().catch(() => []),
                ])
                if (!active) return
                setIssues(Array.isArray(issueList) ? issueList : [])
                setUser(Array.isArray(userList) ? userList : [])
                setDelivery(Array.isArray(deliveryList) ? deliveryList : [])
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

    const userMap = useMemo(() => new Map(users.map((u) => [u._id, u])), [users])
    const deliveryMap = useMemo(() => new Map(deliveries.map((d) => [d._id, d])), [deliveries])

    const categories = useMemo(() => {
        return issues.reduce((counts, issue) => {
            const cat = issue.category || 'Khác'
            counts[cat] = (counts[cat] || 0) + 1
            return counts
        }, {})
    }, [issues])

    const filteredIssues = useMemo(() => {
        return issues.filter((issue) => {
            if (filter !== 'all' && issue.status !== filter) return false
            if (categoryFilter !== 'all' && issue.category !== categoryFilter) return false

            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase()
                const desc = (issue.description || '').toLowerCase()
                const cat = (issue.category || '').toLowerCase()
                const delId = (issue.deliveryId || '').toLowerCase()
                const owner = userMap.get(issue.ownerId)
                const ownerName = (owner?.name || '').toLowerCase()
                const shipper = userMap.get(issue.shipperId)
                const shipperName = (shipper?.name || '').toLowerCase()

                if (
                    !desc.includes(term) &&
                    !cat.includes(term) &&
                    !delId.includes(term) &&
                    !ownerName.includes(term) &&
                    !shipperName.includes(term)
                ) {
                    return false
                }
            }
            return true
        })
    }, [issues, filter, categoryFilter, searchTerm, userMap])

    const openCount = issues.filter((i) => i.status === 'open').length
    const resolvedCount = issues.filter((i) => i.status === 'resolved').length
    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Không có'

    return (
        <AdminPage
            eyebrow="Theo dõi sự cố"
            title="Báo cáo & Sự cố giao hàng"
            description="Tiếp nhận và giám sát các báo cáo kẹt khóa, sai mã, tai nạn hoặc sự cố giao hàng do shipper gửi về."
            action={
                <button
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-200 backdrop-blur-md hover:bg-white/10 hover:text-white transition"
                    onClick={() => refresh()}
                    type="button"
                >
                    <RotateCw className="h-3.5 w-3.5" />
                    Làm mới báo cáo
                </button>
            }
        >
            {error && <ErrorMessage message={error} />}

            {/* Bento Summary Stats */}
            <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="flex items-center gap-4 p-4 border-white/10 bg-slate-900/40">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng số báo cáo</p>
                        <p className="mt-0.5 text-2xl font-black text-white">{issues.length}</p>
                    </div>
                </Card>

                <Card className="flex items-center gap-4 p-4 border-white/10 bg-slate-900/40">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Chờ xử lý (Open)</p>
                        <p className="mt-0.5 text-2xl font-black text-amber-400">{openCount}</p>
                    </div>
                </Card>

                <Card className="flex items-center gap-4 p-4 border-white/10 bg-slate-900/40">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Đã giải quyết</p>
                        <p className="mt-0.5 text-2xl font-black text-emerald-400">{resolvedCount}</p>
                    </div>
                </Card>

                <Card className="flex items-center gap-4 p-4 border-white/10 bg-slate-900/40">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Clock className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sự cố nhiều nhất</p>
                        <p className="mt-0.5 text-base font-bold text-cyan-300 truncate max-w-[9rem] capitalize">{topCategory}</p>
                    </div>
                </Card>
            </section>

            {/* Bộ lọc và tìm kiếm */}
            <Card className="p-4 border-white/10 bg-slate-900/40">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-9 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none"
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Tìm mô tả, nhân viên giao hàng, chủ sở hữu..."
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
                            <span className="text-xs font-semibold text-slate-400">Trạng thái:</span>
                            <select
                                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs text-white focus:border-purple-500/50 focus:outline-none"
                                onChange={(e) => setFilter(e.target.value)}
                                value={filter}
                            >
                                <option value="all">Tất cả trạng thái</option>
                                <option value="open">Đang mở (Open)</option>
                                <option value="resolved">Đã giải quyết</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-400">Danh mục:</span>
                            <select
                                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs capitalize text-white focus:border-purple-500/50 focus:outline-none"
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                value={categoryFilter}
                            >
                                <option value="all">Tất cả danh mục</option>
                                {Object.keys(categories).map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat} ({categories[cat]})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Bảng báo cáo */}
            {loading ? (
                <Loading label="Đang tải báo cáo sự cố giao hàng..." />
            ) : filteredIssues.length === 0 ? (
                <Card className="p-12 text-center border-dashed border-white/10 bg-slate-900/20">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500/40 mb-3" />
                    <p className="text-sm font-semibold text-slate-300">Không có sự cố nào</p>
                    <p className="text-xs text-slate-500 mt-1">Tất cả đơn giao hàng đang vận hành bình thường</p>
                </Card>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                    <table className="w-full min-w-[65rem] text-left text-sm">
                        <thead className="border-b border-white/10 bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-slate-400">
                            <tr>
                                <th className="px-5 py-3.5">Danh mục</th>
                                <th className="px-5 py-3.5">Mô tả sự cố</th>
                                <th className="px-5 py-3.5">Đơn hàng liên quan</th>
                                <th className="px-5 py-3.5">Shipper báo cáo</th>
                                <th className="px-5 py-3.5">Chủ sở hữu</th>
                                <th className="px-5 py-3.5">Trạng thái</th>
                                <th className="px-5 py-3.5">Thời điểm</th>
                                <th className="px-5 py-3.5 text-right">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredIssues.map((issue) => {
                                const owner = userMap.get(issue.ownerId)
                                const shipper = userMap.get(issue.shipperId)
                                const delivery = deliveryMap.get(issue.deliveryId)

                                return (
                                    <tr className="hover:bg-white/[0.02] transition" key={issue._id}>
                                        <td className="px-5 py-3.5">
                                            <span className="inline-block rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                                                {issue.category}
                                            </span>
                                        </td>
                                        <td className="max-w-xs px-5 py-3.5 text-xs text-slate-300">
                                            <p className="line-clamp-2 leading-relaxed">{issue.description}</p>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs">
                                            {delivery ? (
                                                <div>
                                                    <span className="font-mono font-bold text-cyan-400">#{delivery._id.slice(-6).toUpperCase()}</span>
                                                    <p className="text-[11px] text-slate-400 truncate max-w-[10rem]">{delivery.deliveryAddress}</p>
                                                </div>
                                            ) : (
                                                <span className="font-mono text-slate-500">#{issue.deliveryId ? issue.deliveryId.slice(-6).toUpperCase() : '—'}</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-xs">
                                            {shipper ? (
                                                <Link to={`/admin/users/${shipper._id}`} className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline">
                                                    {shipper.name}
                                                </Link>
                                            ) : (
                                                <span className="font-mono text-slate-500">{issue.shipperId ? issue.shipperId.slice(-6) : '—'}</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-xs">
                                            {owner ? (
                                                <Link to={`/admin/users/${owner._id}`} className="font-medium text-slate-300 hover:text-white hover:underline">
                                                    {owner.name}
                                                </Link>
                                            ) : (
                                                <span className="font-mono text-slate-500">{issue.ownerId ? issue.ownerId.slice(-6) : '—'}</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <StatusPill value={issue.status} />
                                        </td>
                                        <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                                            {issue.createdAt ? new Date(issue.createdAt).toLocaleString('vi-VN') : '—'}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <button
                                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-white/10 hover:text-white transition"
                                                onClick={() => setSelectedIssue(issue)}
                                                type="button"
                                            >
                                                Xem
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Issue Detail Modal */}
            {selectedIssue && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
                    onClick={() => setSelectedIssue(null)}
                >
                    <div
                        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl backdrop-blur-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2.5">
                                <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold uppercase text-amber-300">
                                    {selectedIssue.category}
                                </span>
                                <StatusPill value={selectedIssue.status} />
                            </div>
                            <button
                                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
                                onClick={() => setSelectedIssue(null)}
                                type="button"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-4 space-y-4 text-xs">
                            <div>
                                <h4 className="font-bold uppercase tracking-wider text-slate-300 text-[11px]">Nội dung phản ánh từ tài xế</h4>
                                <p className="mt-1.5 rounded-xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-relaxed text-slate-200">
                                    {selectedIssue.description}
                                </p>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 space-y-2">
                                <h4 className="font-bold uppercase tracking-wider text-slate-300 text-[11px]">Thông tin đơn hàng liên quan</h4>
                                <p className="text-slate-300">
                                    <span className="text-slate-500">Mã đơn:</span> <span className="font-mono font-bold text-cyan-400">#{selectedIssue.deliveryId}</span>
                                </p>
                                {deliveryMap.get(selectedIssue.deliveryId) && (
                                    <>
                                        <p className="text-slate-300">
                                            <span className="text-slate-500">Điểm lấy:</span> {deliveryMap.get(selectedIssue.deliveryId).pickupAddress}
                                        </p>
                                        <p className="text-slate-300">
                                            <span className="text-slate-500">Điểm giao:</span> {deliveryMap.get(selectedIssue.deliveryId).deliveryAddress}
                                        </p>
                                        <p className="text-slate-300">
                                            <span className="text-slate-500">Trạng thái đơn:</span> {deliveryMap.get(selectedIssue.deliveryId).status}
                                        </p>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3.5">
                                    <p className="text-slate-400 font-semibold">Tài xế báo cáo</p>
                                    <p className="mt-1 font-bold text-white">
                                        {userMap.get(selectedIssue.shipperId)?.name || selectedIssue.shipperId}
                                    </p>
                                    <p className="text-slate-400 text-[11px] mt-0.5">{userMap.get(selectedIssue.shipperId)?.phone || 'Không có SĐT'}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3.5">
                                    <p className="text-slate-400 font-semibold">Chủ sở hữu đội xe</p>
                                    <p className="mt-1 font-bold text-white">
                                        {userMap.get(selectedIssue.ownerId)?.name || selectedIssue.ownerId}
                                    </p>
                                    <p className="text-slate-400 text-[11px] mt-0.5">{userMap.get(selectedIssue.ownerId)?.email || 'Không có email'}</p>
                                </div>
                            </div>

                            <p className="text-slate-500 text-[11px]">
                                Thời điểm báo cáo: {selectedIssue.createdAt ? new Date(selectedIssue.createdAt).toLocaleString('vi-VN') : '—'}
                            </p>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                className="rounded-xl border border-white/10 bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-bold text-white transition"
                                onClick={() => setSelectedIssue(null)}
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