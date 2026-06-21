'use client'

/* ════════════════════════════════════════════════════════════════════════
   sonify — a tiny WebAudio engine for cinematic finance moments.

   Turn market structure and neural activations into sound:
   • note()     — a single shaped tone (used as each layer "fires")
   • chord()    — a resolving triad; major = bullish, minor = bearish
   • pad()      — an evolving ambient drone for flythroughs
   • sweep()    — a rising arpeggio that follows a signal through layers

   Nothing makes a sound until the user has interacted (browser autoplay
   policy). Create the engine on a click/tap, then call its methods.
   ════════════════════════════════════════════════════════════════════════ */

const A4 = 440
// Map a scale degree (semitones from A4) → frequency.
const hz = (semitones: number) => A4 * Math.pow(2, semitones / 12)

// A pentatonic-ish ladder reads as "musical" no matter the order — good for data.
const PENTA = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24]

export class Sonifier {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private padNodes: { osc: OscillatorNode; gain: GainNode }[] = []
  muted = false

  /** Lazily create / resume the audio context. Call from a user gesture. */
  resume() {
    if (typeof window === 'undefined') return
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.5
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
  }

  setMuted(m: boolean) {
    this.muted = m
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05)
    }
  }

  /** One shaped tone. `degree` indexes the pentatonic ladder. */
  note(degree: number, { dur = 0.5, type = 'sine', gain = 0.3, when = 0, detune = 0 }: { dur?: number; type?: OscillatorType; gain?: number; when?: number; detune?: number } = {}) {
    if (!this.ctx || !this.master || this.muted) return
    const t = this.ctx.currentTime + when
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.value = hz(PENTA[Math.max(0, Math.min(PENTA.length - 1, degree))] - 12)
    osc.detune.value = detune
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g); g.connect(this.master)
    osc.start(t); osc.stop(t + dur + 0.05)
  }

  /** A resolving chord. up=true → major (bullish), up=false → minor (bearish). */
  chord(up: boolean, { root = -5, dur = 2.4, gain = 0.22 }: { root?: number; dur?: number; gain?: number } = {}) {
    if (!this.ctx || !this.master || this.muted) return
    const third = up ? 4 : 3
    const intervals = [0, third, 7, 12]
    intervals.forEach((iv, i) => {
      const t = this.ctx!.currentTime + i * 0.06
      const osc = this.ctx!.createOscillator()
      const g = this.ctx!.createGain()
      osc.type = i === 0 ? 'triangle' : 'sine'
      osc.frequency.value = hz(root + iv)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(gain, t + 0.08)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      osc.connect(g); g.connect(this.master!)
      osc.start(t); osc.stop(t + dur + 0.1)
    })
    // a low sub for weight
    this.note(0, { dur: dur, type: 'sine', gain: gain * 0.6, detune: -1200 })
  }

  /** A rising arpeggio that tracks a signal moving through N layers. */
  sweep(n: number, { stepMs = 110, gain = 0.26 }: { stepMs?: number; gain?: number } = {}) {
    if (this.muted) return
    for (let i = 0; i < n; i++) {
      this.note(2 + i, { dur: 0.4, type: 'triangle', gain, when: (i * stepMs) / 1000 })
    }
  }

  /** Start an evolving ambient drone (for camera flythroughs). */
  startPad(root = -12) {
    if (!this.ctx || !this.master || this.muted || this.padNodes.length) return
    ;[0, 7, 12].forEach((iv, i) => {
      const osc = this.ctx!.createOscillator()
      const g = this.ctx!.createGain()
      osc.type = 'sawtooth'
      osc.frequency.value = hz(root + iv)
      osc.detune.value = (i - 1) * 4
      g.gain.setValueAtTime(0, this.ctx!.currentTime)
      g.gain.linearRampToValueAtTime(0.05, this.ctx!.currentTime + 1.4)
      // gentle filter to tame the saws
      const filt = this.ctx!.createBiquadFilter()
      filt.type = 'lowpass'; filt.frequency.value = 600
      osc.connect(filt); filt.connect(g); g.connect(this.master!)
      osc.start()
      this.padNodes.push({ osc, gain: g })
    })
  }

  stopPad() {
    if (!this.ctx) return
    this.padNodes.forEach(({ osc, gain }) => {
      gain.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.4)
      osc.stop(this.ctx!.currentTime + 1.2)
    })
    this.padNodes = []
  }

  dispose() {
    this.stopPad()
    if (this.ctx) { this.ctx.close().catch(() => {}); this.ctx = null }
  }
}
