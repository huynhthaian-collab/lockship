import axios from 'axios'

export function getApiBaseUrl() {
    let url = (import.meta.env.VITE_API_BASE_URL || '').trim()
    if (!url) {
        if (typeof window !== 'undefined' && window.location.origin) {
            url = `${window.location.origin}/api`
        } else {
            url = 'http://localhost:5000/api'
        }
    }
    // Auto-upgrade http to https when running in a secure HTTPS context to avoid Mixed Content
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
        url = url.replace(/^http:\/\//, 'https://')
    }
    return url.replace(/\/$/, '')
}

export function getApiOrigin() {
    return getApiBaseUrl().replace(/\/api(?:\/v\d+)?\/?$/, '')
}

const apiClient = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 15000,
    withCredentials: true,
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
})

apiClient.interceptors.request.use((config) => {
    config.lockshipAuthenticatedRequest = !config.skipAuth
    delete config.skipAuth
    if (typeof window !== 'undefined') {
        try {
            const token = localStorage.getItem('lockship_token')
            if (token && !config.headers.Authorization) {
                config.headers.Authorization = `Bearer ${token}`
            }
        } catch {
            // Ignore storage errors
        }
    }
    return config
})

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const responseData = error.response?.data
        const apiError = new Error(responseData?.message || error.message || 'Request failed.')
        apiError.status = error.response?.status
        apiError.code = responseData?.data?.errorCode
        apiError.details = responseData?.data?.errors
        apiError.cause = error

        if (error.response?.status === 401 && error.config?.lockshipAuthenticatedRequest) {
            window.dispatchEvent(new CustomEvent('lockship:unauthorized'))
        }

        return Promise.reject(apiError)
    },
)

export default apiClient