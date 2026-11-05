import React from 'react'
import { Truck, Unlock, PackageCheck, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react'

const STEPS = [
    {
        id: 1,
        title: 'Đang giao',
        sub: 'Đến trạm tủ',
        icon: Truck,
        activeColor: 'text-cyan-400 bg-cyan-500/20 border-cyan-400 shadow-cyan-500/20',
        doneColor: 'text-cyan-300 bg-cyan-500/30 border-cyan-400',
    },
    {
        id: 2,
        title: 'Đã mở tủ',
        sub: 'Bấm PIN mở hộc',
        icon: Unlock,
        activeColor: 'text-amber-400 bg-amber-500/20 border-amber-400 shadow-amber-500/20',
        doneColor: 'text-amber-300 bg-amber-500/30 border-amber-400',
    },
    {
        id: 3,
        title: 'Hàng trong tủ',
        sub: 'Khóa an toàn',
        icon: PackageCheck,
        activeColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-400 shadow-emerald-500/20',
        doneColor: 'text-emerald-300 bg-emerald-500/30 border-emerald-400',
    },
    {
        id: 4,
        title: 'Đã lấy hàng',
        sub: 'Hoàn tất giao nhận',
        icon: CheckCircle2,
        activeColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-400 shadow-emerald-500/20',
        doneColor: 'text-emerald-300 bg-emerald-500/30 border-emerald-400',
    },
]

export function getStepFromStatus(status) {
    if (!status) return 1
    const s = String(status).toUpperCase()

    if (s.includes('PICKED_UP') || s === 'COMPLETED') return 4
    if (s.includes('PARCEL_IN_LOCKER') || s.includes('DELIVERED') || s === 'DELIVERED_TO_LOCKER') return 3
    if (s.includes('UNLOCKED')) return 2
    if (s.includes('APPROVED') || s.includes('ARRIVED') || s.includes('PENDING') || s.includes('DISPATCHED')) return 1
    return 1
}

export default function DeliveryStatusStepper({ currentStatus, timestamps = {}, className = '' }) {
    const isRejected = ['REJECTED', 'CANCELLED', 'FAILED'].includes(String(currentStatus).toUpperCase())
    const currentStep = isRejected ? 0 : getStepFromStatus(currentStatus)

    if (isRejected) {
        return (
            <div className={`flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold ${className}`}>
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Yêu cầu giao hàng đã bị hủy hoặc từ chối.</span>
            </div>
        )
    }

    return (
        <div className={`w-full py-3 ${className}`}>
            <div className="relative flex items-center justify-between">
                {/* Background Connecting Line */}
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-800 rounded-full z-0" />
                
                {/* Filled Connecting Line */}
                <div
                    className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-cyan-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-500 z-0"
                    style={{
                        width: `${Math.max(0, Math.min(100, ((currentStep - 1) / (STEPS.length - 1)) * 100))}%`,
                    }}
                />

                {/* Steps */}
                {STEPS.map((step) => {
                    const isDone = currentStep > step.id
                    const isActive = currentStep === step.id
                    const isUpcoming = currentStep < step.id
                    const Icon = step.icon

                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center group">
                            {/* Circle badge */}
                            <div
                                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 shadow-md ${
                                    isActive
                                        ? `${step.activeColor} ring-4 ring-white/10 scale-110`
                                        : isDone
                                        ? `${step.doneColor}`
                                        : 'bg-slate-900 border-slate-700/80 text-slate-500'
                                }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                            </div>

                            {/* Label */}
                            <div className="text-center mt-2">
                                <p
                                    className={`text-xs font-bold transition-colors ${
                                        isActive
                                            ? 'text-white'
                                            : isDone
                                            ? 'text-slate-200'
                                            : 'text-slate-500'
                                    }`}
                                >
                                    {step.title}
                                </p>
                                <p className="text-[10px] text-slate-400 hidden sm:block">
                                    {step.sub}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
