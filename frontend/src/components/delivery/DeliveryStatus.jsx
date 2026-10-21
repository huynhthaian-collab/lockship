import Badge from '../ui/Badge.jsx'

const tones = {
  // Emerald (Green): Unlocked / Success / Online / Active / Completed
  completed: 'green',
  succeeded: 'green',
  online: 'green',
  unlocked: 'green',
  active: 'green',
  success: 'green',
  resolved: 'green',

  // Blue: Processing / In-progress / In transit / Arrived / Accepted / Authorized
  'in-progress': 'blue',
  in_progress: 'blue',
  arrived: 'blue',
  accepted: 'blue',
  authorized: 'blue',

  // Amber (Yellow): Pending / Waiting / Assigned / Open
  pending: 'amber',
  assigned: 'amber',
  open: 'amber',
  waiting: 'amber',
  created: 'amber',

  // Rose (Red): Locked / Error / Offline / Cancelled / Failed / Suspended
  locked: 'red',
  offline: 'red',
  failed: 'red',
  cancelled: 'red',
  error: 'red',
  suspended: 'red',
  reported: 'red',

  // Gray: Inactive / Not started
  inactive: 'gray',
  'not-started': 'gray',
  not_started: 'gray',
}

const labels = {
  completed: 'Đã hoàn tất',
  succeeded: 'Thành công',
  online: 'Trực tuyến',
  unlocked: 'Đã mở khóa',
  authorized: 'Đã cấp quyền',
  arrived: 'Đã đến nơi',
  accepted: 'Đã tiếp nhận',
  'in-progress': 'Đang thực hiện',
  in_progress: 'Đang thực hiện',
  'not-started': 'Chưa bắt đầu',
  not_started: 'Chưa bắt đầu',
  pending: 'Đang chờ',
  assigned: 'Đã phân công',
  open: 'Đang mở',
  failed: 'Thất bại',
  error: 'Lỗi',
  success: 'Thành công',
  cancelled: 'Đã hủy',
  offline: 'Ngoại tuyến',
  locked: 'Đã khóa an toàn',
  active: 'Đang hoạt động',
  inactive: 'Ngừng hoạt động',
  suspended: 'Tạm ngưng',
  resolved: 'Đã xử lý',
  waiting: 'Đang chờ',
  created: 'Đã tạo',
  reported: 'Đã báo cáo',
  owner: 'Chủ sở hữu',
  shipper: 'Nhân viên giao hàng',
  admin: 'Quản trị viên',
}

export default function DeliveryStatus({ value }) {
  const key = String(value || '')
  const label = labels[key] || 'Không xác định'
  const tone = tones[value] || 'gray'
  return <Badge tone={tone}>{label}</Badge>
}
