import { io } from 'socket.io-client'
import { getApiOrigin } from './apiClient.js'

let socket

export function getSocketUrl() {
  let target = (import.meta.env.VITE_SOCKET_URL || '').trim()
  if (!target) {
    target = getApiOrigin()
  }

  // Auto-upgrade protocol when running in secure HTTPS context to prevent Mixed Content
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    if (target.startsWith('http://')) {
      target = target.replace(/^http:\/\//, 'https://')
    } else if (target.startsWith('ws://')) {
      target = target.replace(/^ws:\/\//, 'wss://')
    }
  }

  return target.replace(/\/$/, '')
}

export function connectSocket() {
  if (socket) {
    if (!socket.connected) socket.connect()
    return socket
  }

  socket?.disconnect()
  socket = io(getSocketUrl(), {
    autoConnect: false,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling'],
    secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
  })
  socket.connect()
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = undefined
}

export function getSocket() {
  return socket
}

export function createGuestSocket(guestToken) {
  return io(getSocketUrl(), {
    auth: { token: guestToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
    secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
  })
}