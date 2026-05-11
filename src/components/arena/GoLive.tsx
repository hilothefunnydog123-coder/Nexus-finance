'use client'

import { useState, useRef, useEffect } from 'react'
import { Radio, X, Monitor, Mic, MicOff, Eye, Zap } from 'lucide-react'

interface Props {
  traderName: string
  pnlPct: number
  rank: number
  symbol: string
}

export default function GoLive({ traderName, pnlPct, rank, symbol }: Props) {
  const [open, setOpen] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [viewers] = useState(Math.floor(Math.random() * 400 + 80))
  const [duration, setDuration] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: micOn,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setStreaming(true)
      setDuration(0)
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)

      // Mark as live in localStorage so arena can detect it
      localStorage.setItem('yn_live_stream', JSON.stringify({
        trader: traderName, symbol, startedAt: Date.now()
      }))

      // Stop if user ends screen share via browser UI
      stream.getVideoTracks()[0].onended = stopStream
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'NotAllowedError') {
        window.alert('Could not start stream. Make sure you allow screen sharing.')
      }
    }
  }

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setStreaming(false)
    if (timerRef.current) clearInterval(timerRef.current)
    localStorage.removeItem('yn_live_stream')
  }

  useEffect(() => () => {
    stopStream()
  }, [])

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#ff475720', border: '1px solid #ff475740', borderRadius: 8, color: '#ff4757', fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#ff475730')}
      onMouseLeave={e => (e.currentTarget.style.background = '#ff475720')}>
      <Radio size={13} /> Go Live
    </button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#0a0f1a', border: '1px solid #1a2d4a', borderRadius: 20, width: '100%', maxWidth: 820, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #0d1826', display: 'flex', alignItems: 'center', gap: 10 }}>
          {streaming ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ff1744', borderRadius: 4, padding: '4px 10px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'yn-pulse 1s ease-in-out infinite' }} />
              <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: '0.15em' }}>LIVE</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a2d4a', borderRadius: 4, padding: '4px 10px' }}>
              <Radio size={10} color="#4a5e7a" />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#4a5e7a', letterSpacing: '0.12em' }}>OFFLINE</span>
            </div>
          )}
          <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{traderName}&apos;s Stream</span>
          {streaming && (
            <>
              <span style={{ fontSize: 11, color: '#4a5e7a', fontFamily: 'monospace' }}>{fmt(duration)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#4a5e7a' }}>
                <Eye size={11} /> {(viewers + Math.floor(duration / 10)).toLocaleString()} watching
              </div>
            </>
          )}
          <button onClick={() => { stopStream(); setOpen(false) }}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#4a5e7a', cursor: 'pointer', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Video preview */}
        <div style={{ flex: 1, background: '#04080f', position: 'relative', minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {streaming ? (
            <>
              <video ref={videoRef} muted style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />

              {/* P&L overlay */}
              <div style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(4,8,15,0.85)', border: '1px solid #1a2d4a', borderRadius: 10, padding: '8px 14px', backdropFilter: 'blur(8px)' }}>
                <div style={{ fontSize: 10, color: '#4a5e7a', marginBottom: 2 }}>{traderName} · Rank #{rank} · {symbol}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: pnlPct >= 0 ? '#00ff88' : '#ff4757', fontFamily: 'monospace' }}>
                  {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                </div>
              </div>

              {/* LIVE watermark */}
              <div style={{ position: 'absolute', top: 14, right: 14, background: '#ff1744', borderRadius: 4, padding: '4px 10px' }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: '0.15em' }}>● LIVE</span>
              </div>

              {/* Viewer count bottom left */}
              <div style={{ position: 'absolute', bottom: 14, left: 14, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(4,8,15,0.75)', borderRadius: 6, padding: '5px 10px', backdropFilter: 'blur(6px)' }}>
                <Eye size={11} color="#fff" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>{(viewers + Math.floor(duration / 10)).toLocaleString()}</span>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: '#ff475715', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Monitor size={28} color="#ff4757" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Ready to go live</div>
              <div style={{ fontSize: 13, color: '#4a5e7a', marginBottom: 24, maxWidth: 360 }}>
                When you click Go Live, your browser will ask which screen or window to share. Your viewers will see your trading setup in real-time with your live P&L overlay.
              </div>

              {/* Mic toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
                <button onClick={() => setMicOn(m => !m)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: micOn ? '#00ff8820' : '#1a2d4a', border: `1px solid ${micOn ? '#00ff8840' : '#1a2d4a'}`, borderRadius: 8, color: micOn ? '#00ff88' : '#4a5e7a', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {micOn ? <Mic size={13} /> : <MicOff size={13} />}
                  {micOn ? 'Mic On' : 'Mic Off'}
                </button>
              </div>

              <button onClick={startStream}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 32px', background: 'linear-gradient(135deg, #ff4757, #c0392b)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 900, cursor: 'pointer', margin: '0 auto', boxShadow: '0 0 32px rgba(255,71,87,0.4)' }}>
                <Radio size={16} /> Go Live Now
              </button>
              <div style={{ fontSize: 10, color: '#2a4060', marginTop: 10 }}>Your screen will be visible to all arena viewers</div>
            </div>
          )}
        </div>

        {/* Controls when live */}
        {streaming && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #0d1826', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 11, color: '#4a5e7a' }}>
              Stream duration: <span style={{ color: '#fff', fontFamily: 'monospace' }}>{fmt(duration)}</span>
            </div>
            <div style={{ fontSize: 11, color: '#4a5e7a' }}>
              Viewers: <span style={{ color: '#00ff88', fontFamily: 'monospace', fontWeight: 700 }}>{(viewers + Math.floor(duration / 10)).toLocaleString()}</span>
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={() => setMicOn(m => !m)}
              style={{ padding: '7px 14px', background: micOn ? '#00ff8820' : '#1a2d4a', border: `1px solid ${micOn ? '#00ff8840' : '#1a2d4a'}`, borderRadius: 8, color: micOn ? '#00ff88' : '#4a5e7a', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              {micOn ? <Mic size={11} /> : <MicOff size={11} />} {micOn ? 'Mic On' : 'Mic Off'}
            </button>
            <button onClick={stopStream}
              style={{ padding: '7px 16px', background: '#ff475720', border: '1px solid #ff475740', borderRadius: 8, color: '#ff4757', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
              End Stream
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes yn-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.7)} }`}</style>
    </div>
  )
}
