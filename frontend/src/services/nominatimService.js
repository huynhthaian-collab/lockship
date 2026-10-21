/**
 * OpenStreetMap Nominatim Geocoding & Reverse Geocoding Service
 * Compliant with Nominatim Usage Policy (User-Agent header, caching & debounce)
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org'
const queryCache = new Map()
const reverseCache = new Map()

export async function searchAddress(query, signal) {
    const trimmed = (query || '').trim()
    if (!trimmed || trimmed.length < 3) return []

    const cacheKey = trimmed.toLowerCase()
    if (queryCache.has(cacheKey)) {
        return queryCache.get(cacheKey)
    }

    const params = new URLSearchParams({
        q: trimmed,
        format: 'json',
        addressdetails: '1',
        limit: '6',
        countrycodes: 'vn', // Priority for Vietnam addresses
        viewbox: '105.65,10.15,105.85,9.95', // Bias search results toward Ninh Kiều, Cần Thơ
        bounded: '0', // Soft bounding box (prioritizes local area while keeping VN nationwide fallback)
    })

    try {
        const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params.toString()}`, {
            signal,
            headers: {
                Accept: 'application/json',
                'User-Agent': 'Lockship-SmartLocker-GIS/1.0',
            },
        })

        if (!response.ok) {
            throw new Error(`Nominatim error: ${response.statusText}`)
        }

        const data = await response.json()
        const results = (Array.isArray(data) ? data : []).map((item) => ({
            placeId: item.place_id,
            displayName: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            type: item.type,
            importance: item.importance,
            address: item.address || {},
        }))

        queryCache.set(cacheKey, results)
        return results
    } catch (err) {
        if (err.name === 'AbortError') return []
        console.warn('Nominatim geocoding error:', err)
        return []
    }
}

export async function reverseGeocode(lat, lon, signal) {
    if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return null

    const cacheKey = `${lat.toFixed(5)},${lon.toFixed(5)}`
    if (reverseCache.has(cacheKey)) {
        return reverseCache.get(cacheKey)
    }

    const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        format: 'json',
        addressdetails: '1',
    })

    try {
        const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params.toString()}`, {
            signal,
            headers: {
                Accept: 'application/json',
                'User-Agent': 'Lockship-SmartLocker-GIS/1.0',
            },
        })

        if (!response.ok) {
            throw new Error(`Reverse geocode error: ${response.statusText}`)
        }

        const data = await response.json()
        if (!data || !data.display_name) return null

        const addr = data.address || {}
        // Assemble clean formatted address components
        const road = addr.road || addr.pedestrian || addr.suburb || ''
        const suburb = addr.quarter || addr.suburb || addr.neighbourhood || ''
        const district = addr.city_district || addr.district || addr.county || ''
        const city = addr.city || addr.state || addr.province || ''

        const formattedShort = [road, suburb, district, city].filter(Boolean).join(', ') || data.display_name

        const result = {
            displayName: formattedShort,
            fullDisplayName: data.display_name,
            lat: parseFloat(data.lat),
            lon: parseFloat(data.lon),
            addressDetails: addr,
        }

        reverseCache.set(cacheKey, result)
        return result
    } catch (err) {
        if (err.name === 'AbortError') return null
        console.warn('Nominatim reverse error:', err)
        return null
    }
}

export function isValidCoordinate(lat, lon) {
    if (lat == null || lon == null) return false
    const nLat = Number(lat)
    const nLon = Number(lon)
    if (isNaN(nLat) || isNaN(nLon)) return false
    return nLat >= -90 && nLat <= 90 && nLon >= -180 && nLon <= 180
}
