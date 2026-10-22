/**
 * Activity Log Formatter & Natural Language Translator for LockShip
 * Converts technical MQTT/IoT/System events and order actions into human-readable Vietnamese sentences
 */

export function formatTimeRelative(dateInput) {
    if (!dateInput) return 'Vừa xong'
    const date = new Date(dateInput)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHours = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSec < 30) return 'Vừa xong'
    if (diffSec < 60) return `${diffSec} giây trước`
    if (diffMin < 60) return `${diffMin} phút trước`
    if (diffHours < 24) return `${diffHours} giờ trước`
    if (diffDays === 1) return 'Hôm qua'
    if (diffDays < 7) return `${diffDays} ngày trước`
    return date.toLocaleDateString('vi-VN')
}

export function formatTimeAbsolute(dateInput) {
    if (!dateInput) return '—'
    const date = new Date(dateInput)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${hours}:${minutes} - ${day}/${month}/${year}`
}

/**
 * Returns category info: { key, label, color, tone, badgeClass }
 */
export function getLogCategoryMeta(category) {
    switch (category) {
        case 'unlock':
            return {
                key: 'unlock',
                label: 'Đóng/Mở khóa',
                badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                dotClass: 'bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]',
                borderLeft: 'border-l-emerald-500',
            }
        case 'order':
            return {
                key: 'order',
                label: 'Đơn hàng',
                badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
                dotClass: 'bg-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)]',
                borderLeft: 'border-l-blue-500',
            }
        case 'auth':
            return {
                key: 'auth',
                label: 'Tài khoản & Bảo mật',
                badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                dotClass: 'bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.5)]',
                borderLeft: 'border-l-purple-500',
            }
        case 'warning':
            return {
                key: 'warning',
                label: 'Cảnh báo',
                badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                dotClass: 'bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]',
                borderLeft: 'border-l-amber-500',
            }
        case 'error':
        case 'alert':
            return {
                key: 'error',
                label: 'Lỗi & Sự cố',
                badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                dotClass: 'bg-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.5)]',
                borderLeft: 'border-l-rose-500',
            }
        default:
            return {
                key: 'general',
                label: 'Hệ thống',
                badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
                dotClass: 'bg-slate-400',
                borderLeft: 'border-l-slate-500',
            }
    }
}

/**
 * Translates technical raw log into structured human-friendly log object
 */
export function formatHumanActivityLog(rawLog, context = {}) {
    const { userMap = new Map(), deliveryMap = new Map(), deviceMap = new Map() } = context

    const type = String(rawLog.type || rawLog.event || '').toLowerCase()
    const payload = rawLog.payload || {}
    const deviceId = rawLog.deviceId || payload.deviceId || 'BOX-04'
    const deviceName = deviceMap.get(deviceId)?.name || `Tủ khóa ${deviceId}`
    const createdAt = rawLog.createdAt || rawLog.timestamp || new Date()

    // Determine Actor
    let actorName = 'Hệ thống Lockship'
    let actorRole = 'Tự động'
    if (payload.ownerId && userMap.has(payload.ownerId)) {
        const u = userMap.get(payload.ownerId)
        actorName = u.name
        actorRole = 'Chủ sở hữu'
    } else if (payload.shipperId && userMap.has(payload.shipperId)) {
        const u = userMap.get(payload.shipperId)
        actorName = u.name
        actorRole = 'Shipper'
    } else if (rawLog.userName) {
        actorName = rawLog.userName
        actorRole = rawLog.userRole || 'Người dùng'
    }

    // Determine Delivery Code if any
    const deliveryId = rawLog.deliveryId || payload.deliveryId
    const deliveryCode = deliveryId ? `#LS-${String(deliveryId).slice(-4).toUpperCase()}` : null

    let category = 'auth'
    let eventTitle = 'Hoạt động hệ thống'
    let message = ''
    let iconType = 'info'

    // Match Event Types
    if (type.includes('unlock_succeeded') || type.includes('unlock:success') || type.includes('lock_unlocked')) {
        category = 'unlock'
        eventTitle = 'Mở khóa thành công'
        iconType = 'unlock'
        message = `${actorRole === 'Shipper' ? 'Shipper ' + actorName : actorName} đã mở khóa thành công ${deviceName}${deliveryCode ? ` cho đơn hàng ${deliveryCode}` : ''} qua giao thức MQTT an toàn.`
    } else if (type.includes('unlock_failed') || type.includes('unlock:failed')) {
        category = 'error'
        eventTitle = 'Mở khóa thất bại'
        iconType = 'shield-alert'
        const reason = payload.errorCode === 'DEVICE_OFFLINE' ? 'Thiết bị khóa ngoại tuyến' : (payload.details || payload.errorCode || 'Mã mở khóa không hợp lệ')
        message = `Cảnh báo: Xác thực mở tủ thất bại tại ${deviceName}${deliveryCode ? ` cho đơn hàng ${deliveryCode}` : ''} (Lý do: ${reason}).`
    } else if (type.includes('unlock_command_requested') || type.includes('unlock_command_published')) {
        category = 'unlock'
        eventTitle = 'Yêu cầu mở khóa từ xa'
        iconType = 'key'
        message = `${actorName} vừa gửi lệnh Mở khóa từ xa qua MQTT tới ${deviceName}${deliveryCode ? ` cho đơn hàng ${deliveryCode}` : ''}.`
    } else if (type.includes('command_published')) {
        category = 'unlock'
        eventTitle = 'Lệnh điều khiển IoT'
        iconType = 'cpu'
        message = `Hệ thống đã phát lệnh '${payload.command || 'STATUS'}' tới chốt khóa ${deviceName}.`
    } else if (type.includes('device_offline')) {
        category = 'error'
        eventTitle = 'Thiết bị mất kết nối'
        iconType = 'wifi-off'
        message = `Cảnh báo kết nối: Trạm ${deviceName} đã chuyển sang trạng thái Ngoại tuyến (Heartbeat Timeout).`
    } else if (type.includes('device_status') || type.includes('device_online') || type.includes('iot:status')) {
        category = 'auth'
        eventTitle = 'Thiết bị trực tuyến'
        iconType = 'radio'
        const battery = payload.battery !== undefined ? `${payload.battery}%` : '98%'
        const lock = payload.lockStatus === 'unlocked' ? 'đang mở' : 'đã chốt an toàn'
        message = `Trạm ${deviceName} gửi tín hiệu hoạt động: Pin ${battery}, chốt khóa ${lock}.`
    } else if (type.includes('alert') || type.includes('shock') || type.includes('tamper')) {
        category = 'warning'
        eventTitle = 'Cảnh báo an ninh'
        iconType = 'alert'
        message = `Cảnh báo cảm biến: Phát hiện rung chấn hoặc tương tác bất thường tại trạm ${deviceName}!`
    } else if (type.includes('delivery_created') || type.includes('delivery:created') || type.includes('order_created')) {
        category = 'order'
        eventTitle = 'Tạo đơn giao hàng'
        iconType = 'package'
        message = `Chủ sở hữu ${actorName} vừa tạo mới đơn hàng ${deliveryCode || '#LS-1024'} tại trạm ${deviceName}.`
    } else if (type.includes('delivery_assigned') || type.includes('delivery:assigned')) {
        category = 'order'
        eventTitle = 'Phân công đơn hàng'
        iconType = 'truck'
        message = `Đơn hàng ${deliveryCode || '#LS-1024'} đã được phân công cho nhân viên giao hàng ${actorName}.`
    } else if (type.includes('delivery_arrived') || type.includes('delivery:arrived')) {
        category = 'order'
        eventTitle = 'Shipper đã đến trạm'
        iconType = 'map-pin'
        message = `Shipper ${actorName} đã có mặt tại trạm ${deviceName} và sẵn sàng giao hàng vào tủ.`
    } else if (type.includes('delivery_authorized') || type.includes('delivery:authorized')) {
        category = 'unlock'
        eventTitle = 'Cấp mã mở tủ an toàn'
        iconType = 'shield-check'
        message = `Chủ sở hữu ${actorName} đã phê duyệt và sinh mã mở khóa bảo mật cho đơn hàng ${deliveryCode || '#LS-1024'}.`
    } else if (type.includes('delivery_completed') || type.includes('delivery:completed')) {
        category = 'unlock'
        eventTitle = 'Hoàn tất giao nhận'
        iconType = 'check'
        message = `Đơn hàng ${deliveryCode || '#LS-1024'} tại trạm ${deviceName} đã được đóng khóa và hoàn tất thành công!`
    } else if (type.includes('delivery_cancelled') || type.includes('delivery:cancelled')) {
        category = 'error'
        eventTitle = 'Hủy đơn hàng'
        iconType = 'cancel'
        message = `Đơn giao hàng ${deliveryCode || '#LS-1024'} đã bị hủy bởi chủ sở hữu ${actorName}.`
    } else if (type.includes('issue_reported') || type.includes('problem')) {
        category = 'warning'
        eventTitle = 'Báo cáo sự cố'
        iconType = 'alert'
        message = `Nhân viên ${actorName} báo cáo sự cố tại trạm ${deviceName}: "${payload.category || payload.description || 'Chốt khóa phản hồi chậm'}".`
    } else if (type.includes('admin_protect') || type.includes('forbidden')) {
        category = 'error'
        eventTitle = 'Bảo vệ tài khoản Admin'
        iconType = 'shield-alert'
        message = `Hệ thống đã chặn hành vi can thiệp/vô hiệu hóa trái phép tài khoản Quản trị viên (Admin Protection).`
    } else {
        category = 'auth'
        eventTitle = 'Sự kiện hệ thống'
        iconType = 'info'
        message = rawLog.message || `Sự kiện hệ thống được ghi nhận tại ${deviceName}: ${type.replaceAll('_', ' ')}.`
    }

    return {
        id: rawLog._id || String(Math.random()),
        category,
        eventTitle,
        iconType,
        message,
        actorName,
        actorRole,
        deviceName,
        deliveryCode,
        relativeTime: formatTimeRelative(createdAt),
        absoluteTime: formatTimeAbsolute(createdAt),
        rawPayload: payload,
        topic: rawLog.topic || 'lockship/system/events',
    }
}

export const formatActivityLog = formatHumanActivityLog

