import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Human-sounding neural TTS via ElevenLabs. If no key is set, the client falls
// back to the (improved) browser voice. Add ELEVENLABS_API_KEY to enable.
const KEY = process.env.ELEVENLABS_API_KEY || ''
// Default voice "Adam" — confident, warm. Override with ELEVENLABS_VOICE_ID.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_turbo_v2_5'

export async function POST(req: NextRequest) {
  if (!KEY) return NextResponse.json({ fallback: true }, { status: 200 })

  let text = ''
  try {
    ({ text } = await req.json())
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
  text = String(text || '').slice(0, 1200).trim()
  if (!text) return NextResponse.json({ error: 'empty' }, { status: 400 })

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        // Lower stability + higher style = more expressive, emotional, human delivery.
        voice_settings: { stability: 0.38, similarity_boost: 0.8, style: 0.55, use_speaker_boost: true },
      }),
    })
    if (!res.ok) {
      console.error('[tts] elevenlabs', res.status, await res.text().catch(() => ''))
      return NextResponse.json({ fallback: true }, { status: 200 })
    }
    const audio = await res.arrayBuffer()
    return new NextResponse(audio, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    console.error('[tts]', e instanceof Error ? e.message : e)
    return NextResponse.json({ fallback: true }, { status: 200 })
  }
}
