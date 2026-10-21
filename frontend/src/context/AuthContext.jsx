import { useEffect, useRef, useState } from 'react'
import { authApi } from '../services/authApi.js'
import { connectSocket, disconnectSocket } from '../services/socketClient.js'
import { AuthContext } from './authContext.js'

let sessionRestoreRequest

function restoreSessionOnce() {
  if (!sessionRestoreRequest) {
    sessionRestoreRequest = authApi.getCurrentUser().finally(() => {
      sessionRestoreRequest = undefined
    })
  }
  return sessionRestoreRequest
}

const MAX_TIMEOUT_MS = 2147483647 // 2^31 - 1, giới hạn số nguyên 32-bit của setTimeout trong trình duyệt

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')
  const [sessionRestoreError, setSessionRestoreError] = useState('')
  const expiryTimer = useRef(null)

  function clearSession() {
    if (expiryTimer.current) {
      window.clearTimeout(expiryTimer.current)
      expiryTimer.current = null
    }
    disconnectSocket()
  }

  function scheduleSessionExpiry(sessionExpiresAt) {
    const expiryTimestamp = typeof sessionExpiresAt === 'number'
      ? sessionExpiresAt
      : new Date(sessionExpiresAt).getTime()

    if (!Number.isFinite(expiryTimestamp)) {
      throw new Error('Máy chủ trả về thời hạn phiên đăng nhập không hợp lệ.')
    }

    if (expiryTimer.current) {
      window.clearTimeout(expiryTimer.current)
      expiryTimer.current = null
    }

    const remainingMs = expiryTimestamp - Date.now()

    if (remainingMs <= 0) {
      clearSession()
      setUser(null)
      setStatus('ready')
      return
    }

    // Chống integer 32-bit overflow
    const safeDelay = Math.min(remainingMs, MAX_TIMEOUT_MS)

    expiryTimer.current = window.setTimeout(() => {
      if (Date.now() >= expiryTimestamp) {
        clearSession()
        setUser(null)
        setStatus('ready')
      } else {
        // Nếu còn thời gian (do giới hạn 24.8 ngày), tiếp tục hẹn lịch
        scheduleSessionExpiry(expiryTimestamp)
      }
    }, safeDelay)
  }

  useEffect(() => {
    let active = true

    const handleUnauthorized = () => {
      clearSession()
      setUser(null)
      setStatus('ready')
    }

    window.addEventListener('lockship:unauthorized', handleUnauthorized)

    const restoreSession = async () => {
      try {
        const currentUser = await restoreSessionOnce()
        if (!active) return
        if (!currentUser?.user) {
          throw new Error('Máy chủ trả về phiên đăng nhập không hợp lệ.')
        }
        setSessionRestoreError('')
        setUser(currentUser.user)
        setStatus('ready')
        if (currentUser.sessionExpiresAt) {
          scheduleSessionExpiry(currentUser.sessionExpiresAt)
        }
        connectSocket()
      } catch (error) {
        if (!active) return
        if (error.status === 401) {
          clearSession()
          setUser(null)
        } else {
          setSessionRestoreError(error.message || 'Không thể xác minh phiên đăng nhập hiện tại.')
        }
        if (error.status !== 401 && error.status !== 429) {
          console.error('Không thể khôi phục phiên LockShip.', error)
        }
        setStatus('ready')
      }
    }

    restoreSession()
    return () => {
      active = false
      if (expiryTimer.current) {
        window.clearTimeout(expiryTimer.current)
        expiryTimer.current = null
      }
      window.removeEventListener('lockship:unauthorized', handleUnauthorized)
    }
  }, [])

  async function login(credentials) {
    setSessionRestoreError('')
    const session = await authApi.login(credentials)
    if (!session?.user) {
      throw new Error('Máy chủ trả về phiên đăng nhập không hợp lệ.')
    }

    setUser(session.user)
    setStatus('ready')
    if (session.sessionExpiresAt) {
      scheduleSessionExpiry(session.sessionExpiresAt)
    }
    connectSocket()
    return session.user
  }

  async function completeGoogleProfile(profile) {
    setSessionRestoreError('')
    const session = await authApi.completeGoogleProfile(profile)
    if (!session?.user) {
      throw new Error('Máy chủ trả về phiên đăng nhập không hợp lệ.')
    }

    setUser(session.user)
    setStatus('ready')
    if (session.sessionExpiresAt) {
      scheduleSessionExpiry(session.sessionExpiresAt)
    }
    connectSocket()
    return session.user
  }

  async function register(details) {
    return authApi.register(details)
  }

  async function updateProfile(profile) {
    const updatedUser = await authApi.updateProfile(profile)
    setUser(updatedUser)
    return updatedUser
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      clearSession()
      setUser(null)
      setStatus('ready')
    }
  }

  const value = {
    user,
    status,
    isLoading: status === 'loading',
    sessionRestoreError,
    isAuthenticated: Boolean(user),
    login,
    completeGoogleProfile,
    register,
    updateProfile,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
