import { useEffect, useRef } from 'react'
import { getSocket } from '../services/socketClient.js'

export function useSocketEvent(eventName, handler) {
  const handlerRef = useRef(handler)

  // Cập nhật handler mới nhất mà không cần re-subscribe listener
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    const socket = getSocket()
    if (!socket || !eventName) return undefined

    const eventListener = (...args) => {
      if (typeof handlerRef.current === 'function') {
        handlerRef.current(...args)
      }
    }

    socket.on(eventName, eventListener)
    return () => {
      socket.off(eventName, eventListener)
    }
  }, [eventName])
}