import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fork the Brain — Tune BrainStock’s Neural Net Your Way',
  description: 'Take BrainStock’s real neural network and make it yours. Crank up the signals you believe in, mute the ones you don’t, and watch your fork’s forecast diverge from the original — live, on real data. Save your preset to your profile.',
  alternates: { canonical: 'https://ynfinance.org/fork' },
  openGraph: { url: 'https://ynfinance.org/fork', title: 'Fork the Brain — YN Finance' },
}

export default function ForkLayout({ children }: { children: React.ReactNode }) {
  return children
}
