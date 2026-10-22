import { useState } from 'react'
import { Star } from 'lucide-react'
import FeedbackModal from './FeedbackModal.jsx'

export default function FloatingFeedbackButton() {
    const [open, setOpen] = useState(false)

    return (
        <>
            <aside
                aria-label="Đánh giá dịch vụ"
                className="fixed bottom-6 right-6 z-40 animate-fade-in"
            >
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="group relative flex items-center gap-2 rounded-full border border-amber-400/30 bg-gradient-to-r from-[#172554]/90 to-[#1e1b4b]/90 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-xl shadow-[0_10px_25px_-5px_rgba(245,158,11,0.3),0_0_15px_rgba(59,130,246,0.2)] transition-all duration-300 hover:border-amber-400/60 hover:shadow-[0_12px_30px_rgba(245,158,11,0.5),0_0_20px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-95"
                    title="Gửi đánh giá và phản hồi dịch vụ Lockship"
                >
                    <span className="relative flex size-2">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
                    </span>
                    <Star size={15} className="fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)] transition-transform duration-300 group-hover:rotate-12" />
                    <span className="hidden sm:inline bg-gradient-to-r from-amber-200 via-white to-blue-200 bg-clip-text text-transparent">
                        Đánh giá 5 sao
                    </span>
                </button>
            </aside>

            <FeedbackModal open={open} onClose={() => setOpen(false)} />
        </>
    )
}
