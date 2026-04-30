'use client'

import { useEffect, useRef, useCallback } from 'react'

type MessageHandler = (data: unknown) => void

export function useWebSocket(url: string, onMessage: MessageHandler, enabled = true) {
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!enabled || !url) return
    try {
      ws.current = new WebSocket(url)

      ws.current.onopen = () => {
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      }

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessageRef.current(data)
        } catch {}
      }

      ws.current.onerror = () => {}

      ws.current.onclose = () => {
        reconnectTimer.current = setTimeout(connect, 5000)
      }
    } catch {}
  }, [url, enabled])

  const send = useCallback((data: unknown) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data))
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [connect])

  return { send }
}
