import { useState } from 'react'
import { Star } from 'lucide-react'
import { RATING_EMOTIONS } from './ratingConstants.js'

export default function StarRating({
    rating = 0,
    onRatingChange,
    readOnly = false,
    size = 'md',
    showLabel = true,
    className = '',
}) {
    const [hoverRating, setHoverRating] = useState(0)

    const effectiveRating = hoverRating || rating

    const sizeMap = {
        sm: { star: 'size-4', text: 'text-xs' },
        md: { star: 'size-6', text: 'text-sm' },
        lg: { star: 'size-8', text: 'text-base' },
        xl: { star: 'size-10', text: 'text-lg' },
    }

    const currentSize = sizeMap[size] || sizeMap.md
    const emotion = RATING_EMOTIONS[effectiveRating]

    return (
        <div className={`inline-flex flex-col items-center gap-2.5 ${className}`}>
            <div
                className="flex items-center gap-1.5"
                onMouseLeave={() => !readOnly && setHoverRating(0)}
                role={readOnly ? 'img' : 'radiogroup'}
                aria-label={`Đánh giá ${rating} trên 5 sao`}
            >
                {[1, 2, 3, 4, 5].map((starValue) => {
                    const isFilled = starValue <= effectiveRating
                    const isHovered = !readOnly && hoverRating === starValue

                    return (
                        <button
                            key={starValue}
                            type="button"
                            disabled={readOnly}
                            onClick={() => !readOnly && onRatingChange?.(starValue)}
                            onMouseEnter={() => !readOnly && setHoverRating(starValue)}
                            className={`relative rounded-md p-0.5 transition-all duration-200 outline-none ${
                                readOnly
                                    ? 'cursor-default'
                                    : 'cursor-pointer hover:scale-125 focus-visible:scale-110 focus-visible:ring-2 focus-visible:ring-amber-400/50'
                            } ${isHovered ? 'scale-125' : ''}`}
                            aria-label={`${starValue} sao - ${RATING_EMOTIONS[starValue]?.label}`}
                        >
                            <Star
                                className={`${currentSize.star} transition-all duration-200 ${
                                    isFilled
                                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.65)]'
                                        : 'fill-transparent text-slate-600 hover:text-slate-400'
                                }`}
                                strokeWidth={isFilled ? 1.5 : 1.2}
                            />
                        </button>
                    )
                })}
            </div>

            {showLabel && (
                <div className="h-6 flex items-center justify-center">
                    {emotion ? (
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold backdrop-blur-md transition-all duration-300 animate-fade-in ${emotion.color}`}
                        >
                            <span className="text-sm leading-none">{emotion.emoji}</span>
                            <span>{emotion.label}</span>
                        </span>
                    ) : (
                        <span className="text-xs text-slate-500 italic">
                            {readOnly ? 'Chưa có đánh giá' : 'Nhấp để chọn mức độ hài lòng (1 - 5 sao)'}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
