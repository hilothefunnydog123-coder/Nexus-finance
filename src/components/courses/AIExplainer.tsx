'use client'

import { useState } from 'react'
import { Sparkles, Volume2, VolumeX, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

interface Props {
  courseName: string
  sectionTitle: string
  keyPoints: string[]
}

// Simulates AI-generated video explanation
// Real implementation: use HeyGen API or ElevenLabs + slides
export default function AIExplainer({ courseName, sectionTitle, keyPoints }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const speak = () => {
    if (!('speechSynthesis' in window)) return
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return }

    const text = `Here's a quick AI summary of ${sectionTitle} from ${courseName}. ${keyPoints.join('. ')}.`
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1.0

    // Pick a better voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => v.name.includes('Daniel') || v.name.includes('Google') || v.name.includes('Premium'))
    if (preferred) utterance.voice = preferred

    utterance.onend = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
    setSpeaking(true)
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #0d1f35, #071220)', border: '1px solid #1e3a5f', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
      <button onClick={() => setExpanded(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #a855f720, #1e90ff20)', border: '1px solid #a855f740', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={14} color="#a855f7" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#a855f7' }}>AI Summary</div>
          <div style={{ fontSize: 10, color: '#4a5e7a' }}>Quick explanation of this section · click to expand</div>
        </div>
        {expanded ? <ChevronUp size={14} color="#4a5e7a" /> : <ChevronDown size={14} color="#4a5e7a" />}
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ background: '#040c14', borderRadius: 10, padding: '14px', marginBottom: 12 }}>
            <ul style={{ margin: 0, paddingLeft: 16, listStyle: 'none' }}>
              {keyPoints.map((point, i) => (
                <li key={i} style={{ fontSize: 12, color: '#7f93b5', lineHeight: 1.7, marginBottom: 4, paddingLeft: 0 }}>
                  <span style={{ color: '#a855f7', marginRight: 8 }}>→</span>{point}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Browser text-to-speech (free, built-in) */}
            <button onClick={speak}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: speaking ? '#a855f720' : '#0f1f38', border: '1px solid #1e3a5f', borderRadius: 8, cursor: 'pointer', fontSize: 11, color: speaking ? '#a855f7' : '#7f93b5', fontWeight: 600 }}>
              {speaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
              {speaking ? 'Stop Audio' : 'Listen (AI Voice)'}
            </button>

            {/* HeyGen link */}
            <a href="https://www.heygen.com" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#0f1f38', border: '1px solid #1e3a5f', borderRadius: 8, textDecoration: 'none', fontSize: 11, color: '#7f93b5', fontWeight: 600 }}>
              <ExternalLink size={12} />
              Create AI Video (HeyGen)
            </a>
          </div>

          <p style={{ fontSize: 10, color: '#4a5e7a', marginTop: 10, lineHeight: 1.6 }}>
            💡 <strong style={{ color: '#7f93b5' }}>For instructors:</strong> Create a professional AI avatar video for this section at heygen.com — takes 5 minutes, looks like a real studio recording.
          </p>
        </div>
      )}
    </div>
  )
}
