import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
    Compass,
    Loader2,
    AlertCircle,
} from 'lucide-react'
import { reverseGeocode, isValidCoordinate } from '../../services/nominatimService.js'
import { LOCKSHIP_BOXES } from '../../data/smartLockerBoxes.js'

// Fix default Leaflet icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Create custom glowing neon SVG markers
function createNeonPinIcon(color = '#06b6d4', label = '') {
    return L.divIcon({
        className: 'custom-neon-marker',
        html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                <div style="
                    width: 32px;
                    height: 32px;
                    border-radius: 50% 50% 50% 0;
                    background: ${color};
                    transform: rotate(-45deg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 16px ${color}, inset 0 0 6px rgba(255,255,255,0.6);
                    border: 2px solid #ffffff;
                ">
                    <div style="
                        width: 12px;
                        height: 12px;
                        background: #06080d;
                        border-radius: 50%;
                        transform: rotate(45deg);
                    "></div>
                </div>
                ${label ? `<div style="
                    background: rgba(11, 15, 25, 0.9);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: #ffffff;
                    font-size: 10px;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: 6px;
                    white-space: nowrap;
                    margin-top: 4px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                ">${label}</div>` : ''}
            </div>
        `,
        iconSize: [32, 42],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    })
}

function createBoxStationIcon(status = 'Available') {
    const colors = {
        Available: '#10b981', // Emerald
        Locked: '#f43f5e',    // Rose
        Unlocked: '#06b6d4',  // Cyan
    }
    const color = colors[status] || '#10b981'

    return L.divIcon({
        className: 'custom-box-station-marker',
        html: `
            <div style="position: relative; cursor: pointer; display: flex; flex-direction: column; align-items: center;">
                <div style="
                    width: 36px;
                    height: 36px;
                    background: rgba(6, 8, 13, 0.95);
                    border: 2px solid ${color};
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 16px ${color}88, inset 0 0 8px ${color}44;
                    color: ${color};
                    font-weight: 900;
                    font-size: 14px;
                    transition: transform 0.2s;
                ">
                    📦
                </div>
                <div style="
                    background: ${color}22;
                    border: 1px solid ${color}88;
                    color: #ffffff;
                    font-size: 9px;
                    font-weight: 800;
                    padding: 1px 5px;
                    border-radius: 4px;
                    margin-top: 3px;
                    white-space: nowrap;
                    text-transform: uppercase;
                ">${status}</div>
            </div>
        `,
        iconSize: [36, 44],
        iconAnchor: [18, 22],
        popupAnchor: [0, -22],
    })
}

export default function InteractiveMapPicker({
    lat = 10.0336,
    lng = 105.7882,
    zoom = 14,
    onLocationChange,
    onSelectBox,
    selectedBoxId,
    height = '360px',
    showBoxes = true,
    label = 'Vị trí điểm giao nhận',
}) {
    const mapContainerRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const activeMarkerRef = useRef(null)
    const boxesLayerGroupRef = useRef(null)

    const [locating, setLocating] = useState(false)
    const [geoError, setGeoError] = useState('')
    const [currentCoord, setCurrentCoord] = useState({ lat, lng })
    const [reverseLoading, setReverseLoading] = useState(false)

    // Initialize Map Instance
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return

        const initialLat = isValidCoordinate(lat, lng) ? lat : 10.0336
        const initialLng = isValidCoordinate(lat, lng) ? lng : 105.7882

        const map = L.map(mapContainerRef.current, {
            center: [initialLat, initialLng],
            zoom,
            zoomControl: false,
        })

        // Standard OpenStreetMap tiles (100% free, no API key required)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map)

        // Custom position zoom control in bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(map)

        // Draggable Active Delivery Pin
        const pinIcon = createNeonPinIcon('#06b6d4', label)
        const marker = L.marker([initialLat, initialLng], {
            icon: pinIcon,
            draggable: true,
            riseOnHover: true,
        }).addTo(map)

        // Handle Pin Drag
        marker.on('dragend', async () => {
            const position = marker.getLatLng()
            setCurrentCoord({ lat: position.lat, lng: position.lng })
            setReverseLoading(true)
            const result = await reverseGeocode(position.lat, position.lng)
            setReverseLoading(false)
            if (result && onLocationChange) {
                onLocationChange({
                    lat: position.lat,
                    lng: position.lng,
                    address: result.displayName,
                    raw: result,
                })
            }
        })

        // Handle Map Click
        map.on('click', async (event) => {
            const { lat: clickLat, lng: clickLng } = event.latlng
            marker.setLatLng([clickLat, clickLng])
            setCurrentCoord({ lat: clickLat, lng: clickLng })
            setReverseLoading(true)
            const result = await reverseGeocode(clickLat, clickLng)
            setReverseLoading(false)
            if (result && onLocationChange) {
                onLocationChange({
                    lat: clickLat,
                    lng: clickLng,
                    address: result.displayName,
                    raw: result,
                })
            }
        })

        mapInstanceRef.current = map
        activeMarkerRef.current = marker

        return () => {
            map.remove()
            mapInstanceRef.current = null
            activeMarkerRef.current = null
        }
    }, [])

    // Sync external lat/lng changes to Map and Marker
    useEffect(() => {
        if (!mapInstanceRef.current || !activeMarkerRef.current) return
        if (!isValidCoordinate(lat, lng)) return

        const currentPos = activeMarkerRef.current.getLatLng()
        const dist = Math.abs(currentPos.lat - lat) + Math.abs(currentPos.lng - lng)
        if (dist > 0.0001) {
            activeMarkerRef.current.setLatLng([lat, lng])
            mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 })
            setCurrentCoord({ lat, lng })
        }
    }, [lat, lng])

    // Render the 3 Smart Locker Boxes on the Map
    useEffect(() => {
        if (!mapInstanceRef.current || !showBoxes) return

        if (boxesLayerGroupRef.current) {
            boxesLayerGroupRef.current.clearLayers()
        } else {
            boxesLayerGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current)
        }

        LOCKSHIP_BOXES.forEach((box) => {
            const isSelected = selectedBoxId === box.id
            const boxIcon = createBoxStationIcon(box.status)
            const boxMarker = L.marker([box.lat, box.lon], { icon: boxIcon })

            // Custom Styled Dark Popup
            const popupHtml = `
                <div style="font-family: inherit; color: #ffffff; min-width: 220px; padding: 4px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
                        <span style="font-weight: 800; font-size: 13px; color: #22d3ee;">${box.name}</span>
                        <span style="
                            font-size: 10px;
                            font-weight: 700;
                            padding: 2px 6px;
                            border-radius: 4px;
                            background: ${box.status === 'Available' ? '#10b98133' : box.status === 'Locked' ? '#f43f5e33' : '#06b6d433'};
                            color: ${box.status === 'Available' ? '#34d399' : box.status === 'Locked' ? '#fb7185' : '#38bdf8'};
                            border: 1px solid ${box.status === 'Available' ? '#10b98166' : box.status === 'Locked' ? '#f43f5e66' : '#06b6d466'};
                        ">${box.status}</span>
                    </div>
                    <p style="font-size: 11px; color: #94a3b8; margin: 0 0 8px 0; line-height: 1.4;">${box.address}</p>
                    <div style="background: rgba(255,255,255,0.06); padding: 6px; border-radius: 8px; font-size: 11px; margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                            <span style="color: #cbd5e1;">Hộc trống:</span>
                            <strong style="color: #34d399;">${box.availableCompartments} / ${box.totalCompartments}</strong>
                        </div>
                        <div style="display: flex; gap: 6px; color: #94a3b8; font-size: 10px;">
                            <span>S: ${box.slots.S.available}</span>
                            <span>M: ${box.slots.M.available}</span>
                            <span>L: ${box.slots.L.available}</span>
                            <span style="margin-left: auto;">Pin: ${box.battery}%</span>
                        </div>
                    </div>
                    <button id="btn-select-box-${box.id}" style="
                        width: 100%;
                        background: #06b6d4;
                        color: #06080d;
                        border: none;
                        padding: 6px 12px;
                        border-radius: 8px;
                        font-weight: 800;
                        font-size: 11px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 4px;
                    ">
                        ✓ Chọn điểm giao tủ này
                    </button>
                </div>
            `

            boxMarker.bindPopup(popupHtml, {
                className: 'custom-spatial-popup',
                closeButton: true,
            })

            boxMarker.on('popupopen', () => {
                const btn = document.getElementById(`btn-select-box-${box.id}`)
                if (btn) {
                    btn.onclick = () => {
                        if (onSelectBox) onSelectBox(box)
                        if (onLocationChange) {
                            onLocationChange({
                                lat: box.lat,
                                lng: box.lon,
                                address: box.address,
                                box,
                            })
                        }
                        boxMarker.closePopup()
                    }
                }
            })

            boxMarker.addTo(boxesLayerGroupRef.current)
        })
    }, [showBoxes, selectedBoxId, onSelectBox, onLocationChange])

    // Locate Me Handler
    const handleLocateMe = useCallback(() => {
        if (!navigator.geolocation) {
            setGeoError('Trình duyệt không hỗ trợ định vị GPS')
            return
        }

        setLocating(true)
        setGeoError('')

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const userLat = position.coords.latitude
                const userLng = position.coords.longitude
                setLocating(false)
                setCurrentCoord({ lat: userLat, lng: userLng })

                if (mapInstanceRef.current && activeMarkerRef.current) {
                    activeMarkerRef.current.setLatLng([userLat, userLng])
                    mapInstanceRef.current.flyTo([userLat, userLng], 17, { duration: 1.5 })
                }

                setReverseLoading(true)
                const result = await reverseGeocode(userLat, userLng)
                setReverseLoading(false)

                if (result && onLocationChange) {
                    onLocationChange({
                        lat: userLat,
                        lng: userLng,
                        address: result.displayName,
                        raw: result,
                    })
                }
            },
            (error) => {
                setLocating(false)
                setGeoError(
                    error.code === 1
                        ? 'Bạn đã từ chối quyền truy cập vị trí'
                        : 'Không thể xác định tọa độ hiện tại'
                )
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
    }, [onLocationChange])

    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
            {/* Map Container */}
            <div
                className="z-0 w-full"
                ref={mapContainerRef}
                style={{ height }}
            />

            {/* Top Toolbar Overlay */}
            <div className="pointer-events-none absolute left-3 right-3 top-3 z-[400] flex items-center justify-between gap-2">
                <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900/85 px-3 py-1.5 backdrop-blur-md shadow-lg">
                    <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[11px] font-mono font-bold text-slate-200">
                        {currentCoord.lat.toFixed(4)}, {currentCoord.lng.toFixed(4)}
                    </span>
                    {reverseLoading && (
                        <Loader2 className="h-3 w-3 animate-spin text-cyan-400 ml-1" />
                    )}
                </div>

                <button
                    className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-slate-900/90 hover:bg-cyan-500 hover:text-slate-950 px-3 py-1.5 text-xs font-bold text-cyan-400 backdrop-blur-md shadow-lg transition active:scale-95 disabled:opacity-50"
                    disabled={locating}
                    onClick={handleLocateMe}
                    title="Lấy vị trí GPS hiện tại của tôi"
                    type="button"
                >
                    {locating ? (
                        <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Đang định vị...
                        </>
                    ) : (
                        <>
                            <Compass className="h-3.5 w-3.5" />
                            Vị trí của tôi
                        </>
                    )}
                </button>
            </div>

            {/* Bottom Helper Instruction */}
            <div className="pointer-events-none absolute bottom-3 left-3 z-[400]">
                <div className="rounded-xl border border-white/10 bg-slate-900/80 px-2.5 py-1 text-[10px] text-slate-300 backdrop-blur-md">
                    💡 Click hoặc kéo thả ghim xanh để gán tọa độ chính xác
                </div>
            </div>

            {/* Error Banner */}
            {geoError && (
                <div className="absolute bottom-12 left-3 right-3 z-[400] flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/80 p-2.5 text-xs text-red-300 backdrop-blur-md">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                    <span>{geoError}</span>
                </div>
            )}
        </div>
    )
}
