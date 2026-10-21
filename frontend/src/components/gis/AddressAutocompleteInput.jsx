import { useEffect, useRef, useState, useCallback } from 'react'
import {
    MapPin,
    Loader2,
    CheckCircle2,
    AlertCircle,
    X
} from 'lucide-react'
import { searchAddress, isValidCoordinate } from '../../services/nominatimService.js'

export default function AddressAutocompleteInput({
    value = '',
    onChange,
    onSelectLocation,
    placeholder = 'Nhập địa chỉ (VD: Hai Bà Trưng, Ninh Kiều, Cần Thơ)...',
    label = 'Địa chỉ',
    required = false,
    icon: Icon = MapPin,
    iconColor = 'text-cyan-400',
    verifiedCoords = null,
}) {
    const [inputValue, setInputValue] = useState(value)
    const [suggestions, setSuggestions] = useState([])
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [validationError, setValidationError] = useState('')
    const [isVerified, setIsVerified] = useState(Boolean(verifiedCoords && isValidCoordinate(verifiedCoords.lat, verifiedCoords.lng)))

    const containerRef = useRef(null)
    const debounceTimerRef = useRef(null)
    const abortControllerRef = useRef(null)

    // Sync external value
    useEffect(() => {
        setInputValue(value || '')
    }, [value])

    useEffect(() => {
        if (verifiedCoords && isValidCoordinate(verifiedCoords.lat, verifiedCoords.lng)) {
            setIsVerified(true)
            setValidationError('')
        } else if (inputValue.trim().length > 5 && !verifiedCoords) {
            setIsVerified(false)
        }
    }, [verifiedCoords, inputValue])

    // Close suggestions on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Handle typing with Debounce
    const handleInputChange = (event) => {
        const query = event.target.value
        setInputValue(query)
        setIsVerified(false)
        if (onChange) onChange(query)

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        if (query.trim().length < 3) {
            setSuggestions([])
            setIsOpen(false)
            setLoading(false)
            setValidationError('')
            return
        }

        setLoading(true)
        setValidationError('')

        debounceTimerRef.current = setTimeout(async () => {
            const controller = new AbortController()
            abortControllerRef.current = controller

            try {
                const results = await searchAddress(query, controller.signal)
                setSuggestions(results)
                setIsOpen(results.length > 0)
                if (results.length === 0 && query.trim().length >= 5) {
                    setValidationError('Không tìm thấy địa chỉ phù hợp trên bản đồ. Hãy thử nhập chi tiết hơn hoặc chọn trực tiếp trên bản đồ.')
                } else {
                    setValidationError('')
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setValidationError('Không thể kết nối đến máy chủ bản đồ OSM.')
                }
            } finally {
                setLoading(false)
            }
        }, 350)
    }

    // Handle suggestion select
    const handleSelectSuggestion = (item) => {
        setInputValue(item.displayName)
        setSuggestions([])
        setIsOpen(false)
        setValidationError('')
        setIsVerified(true)

        if (onChange) onChange(item.displayName)
        if (onSelectLocation) {
            onSelectLocation({
                address: item.displayName,
                lat: item.lat,
                lng: item.lon,
                details: item.address,
            })
        }
    }

    const handleClear = () => {
        setInputValue('')
        setSuggestions([])
        setIsOpen(false)
        setIsVerified(false)
        setValidationError('')
        if (onChange) onChange('')
        if (onSelectLocation) {
            onSelectLocation({
                address: '',
                lat: null,
                lng: null,
            })
        }
    }

    return (
        <div className="relative space-y-1.5" ref={containerRef}>
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
                    <Icon className={iconColor} size={14} />
                    {label} {required && <span className="text-red-400">*</span>}
                </label>
                {isVerified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <CheckCircle2 size={12} />
                        Đã xác thực tọa độ
                    </span>
                )}
            </div>

            <div className="relative">
                <input
                    className={`w-full rounded-xl border bg-slate-950/70 pl-3.5 pr-16 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition ${
                        validationError
                            ? 'border-red-500/60 focus:border-red-500'
                            : isVerified
                            ? 'border-emerald-500/40 focus:border-emerald-400'
                            : 'border-white/10 focus:border-cyan-500/50'
                    }`}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    required={required}
                    type="text"
                    value={inputValue}
                />

                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                    {loading && <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />}
                    {inputValue && !loading && (
                        <button
                            className="p-1 hover:text-white transition"
                            onClick={handleClear}
                            type="button"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Suggestions Dropdown */}
            {isOpen && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-[500] mt-1 max-h-60 overflow-y-auto rounded-xl border border-white/15 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-2xl">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Gợi ý địa chỉ thực tế (OpenStreetMap)
                    </div>
                    {suggestions.map((item) => (
                        <button
                            className="flex w-full items-start gap-2.5 rounded-lg p-2 text-left hover:bg-white/10 transition"
                            key={item.placeId}
                            onClick={() => handleSelectSuggestion(item)}
                            type="button"
                        >
                            <MapPin className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-white truncate leading-snug">
                                    {item.displayName}
                                </p>
                                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                    GPS: {item.lat.toFixed(4)}, {item.lon.toFixed(4)}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Validation Message */}
            {validationError && (
                <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
                    <AlertCircle size={13} className="shrink-0" />
                    <span>{validationError}</span>
                </p>
            )}

            {isVerified && verifiedCoords && (
                <p className="text-[11px] font-mono text-cyan-400/80 mt-0.5">
                    Tọa độ GPS: {verifiedCoords.lat.toFixed(5)}°N, {verifiedCoords.lng.toFixed(5)}°E
                </p>
            )}
        </div>
    )
}
