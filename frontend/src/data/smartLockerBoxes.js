const STORAGE_KEY = 'lockship_smart_boxes_v1'

const DEFAULT_BOXES = [
    {
        id: 'box-04',
        code: 'BOX-NK-CT-04',
        name: 'Lockship Box #04 (Bến Ninh Kiều - P. Tân An)',
        address: 'Số 2 Đường Hai Bà Trưng, Phường Tân An, Quận Ninh Kiều, TP. Cần Thơ',
        lat: 10.0336,
        lon: 105.7882,
        status: 'Available', // Available | Locked | Unlocked
        totalCompartments: 12,
        availableCompartments: 8,
        slots: {
            S: { total: 6, available: 4, pricePerHour: 5000 },
            M: { total: 4, available: 3, pricePerHour: 10000 },
            L: { total: 2, available: 1, pricePerHour: 15000 },
        },
        battery: 98,
        isOnline: true,
        description: 'Trạm tủ trung tâm Bến Ninh Kiều (gần Cầu Đi Bộ & Tượng Bác), hoạt động 24/7, trang bị camera AI giám sát',
    },
    {
        id: 'box-05',
        code: 'BOX-NK-CT-05',
        name: 'Lockship Box #05 (Đại Học Cần Thơ - P. Xuân Khánh)',
        address: 'Khu II, Đường 3 Tháng 2, Phường Xuân Khánh, Quận Ninh Kiều, TP. Cần Thơ',
        lat: 10.0300,
        lon: 105.7608,
        status: 'Locked',
        totalCompartments: 16,
        availableCompartments: 0,
        slots: {
            S: { total: 8, available: 0, pricePerHour: 5000 },
            M: { total: 5, available: 0, pricePerHour: 10000 },
            L: { total: 3, available: 0, pricePerHour: 15000 },
        },
        battery: 89,
        isOnline: true,
        description: 'Trạm tủ đối diện Cổng A Đại học Cần Thơ (gần Vincom Plaza Xuân Khánh), bảo trì chốt khóa an toàn',
    },
    {
        id: 'box-06',
        code: 'BOX-NK-CT-06',
        name: 'Lockship Box #06 (Vincom Hùng Vương - P. Thới Bình)',
        address: 'Số 2 Đường Hùng Vương, Phường Thới Bình, Quận Ninh Kiều, TP. Cần Thơ',
        lat: 10.0416,
        lon: 105.7825,
        status: 'Unlocked',
        totalCompartments: 10,
        availableCompartments: 5,
        slots: {
            S: { total: 4, available: 2, pricePerHour: 5000 },
            M: { total: 4, available: 2, pricePerHour: 10000 },
            L: { total: 2, available: 1, pricePerHour: 15000 },
        },
        battery: 95,
        isOnline: true,
        description: 'Trạm tủ thương mại Vincom Plaza Hùng Vương, cửa hộc đang mở sẵn sàng nạp kiện hàng',
    },
]

export function getBoxes() {
    try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
        if (stored) {
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed) && parsed.length) return parsed
        }
    } catch {
        // fallback
    }
    return DEFAULT_BOXES
}

export function saveBoxes(boxes) {
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(boxes))
        }
    } catch {
        // ignore
    }
}

export function reserveBoxCompartment(boxId, size = 'M') {
    const boxes = getBoxes()
    const target = boxes.find((b) => b.id === boxId)
    if (!target) return null
    if (target.availableCompartments <= 0 || target.status === 'Locked') {
        throw new Error(`Tủ khóa "${target.name}" đã hết hộc trống hoặc đang khóa bảo trì.`)
    }
    target.availableCompartments = Math.max(0, target.availableCompartments - 1)
    if (target.slots && target.slots[size]) {
        target.slots[size].available = Math.max(0, target.slots[size].available - 1)
    }
    if (target.availableCompartments === 0) {
        target.status = 'Locked'
    }
    saveBoxes(boxes)
    // Synchronize in-memory LOCKSHIP_BOXES
    const memTarget = LOCKSHIP_BOXES.find((b) => b.id === boxId)
    if (memTarget) {
        memTarget.availableCompartments = target.availableCompartments
        memTarget.status = target.status
        if (memTarget.slots?.[size]) memTarget.slots[size].available = target.slots[size]?.available
    }
    return target
}

export function releaseBoxCompartment(boxId, size = 'M') {
    const boxes = getBoxes()
    const target = boxes.find((b) => b.id === boxId)
    if (!target) return null
    target.availableCompartments = Math.min(target.totalCompartments, target.availableCompartments + 1)
    if (target.slots && target.slots[size]) {
        target.slots[size].available = Math.min(target.slots[size].total, target.slots[size].available + 1)
    }
    if (target.availableCompartments > 0 && target.status === 'Locked') {
        target.status = 'Available'
    }
    saveBoxes(boxes)
    const memTarget = LOCKSHIP_BOXES.find((b) => b.id === boxId)
    if (memTarget) {
        memTarget.availableCompartments = target.availableCompartments
        memTarget.status = target.status
        if (memTarget.slots?.[size]) memTarget.slots[size].available = target.slots[size]?.available
    }
    return target
}

export const LOCKSHIP_BOXES = getBoxes()
