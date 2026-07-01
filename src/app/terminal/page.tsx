import type { Metadata } from 'next'
import TerminalClient from './TerminalClient'

export const metadata: Metadata = {
  title: 'PROJECT MATRIX — Prediction-Market Intelligence Platform',
  description:
    'An institutional-grade research terminal for Kalshi: hundreds of cooperating reasoning agents analyze thousands of live sources, a Bayesian consensus engine fuses them into calibrated probabilities, and an edge engine surfaces statistically favorable opportunities. Paper-trading by default; live orders only after explicit confirmation.',
}

export default function TerminalPage() {
  return <TerminalClient />
}
