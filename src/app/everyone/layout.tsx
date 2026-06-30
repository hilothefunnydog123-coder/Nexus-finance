import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'YN for Everyone — Buy now, or wait? The AI that times your big money calls',
  description: 'The same AI that grades its stock forecasts in public, now pointed at the prices normal people sweat: mortgage rates, gas, used cars, flights. Should you buy now or wait? Get the call — with a track record we prove.',
  alternates: { canonical: 'https://ynfinance.org/everyone' },
  openGraph: {
    title: 'YN for Everyone — Buy now, or wait?',
    description: 'An AI that times your everyday big-money decisions — mortgage rates first. Proven, graded, honest.',
    url: 'https://ynfinance.org/everyone',
  },
}

export default function EveryoneLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#f4f2ec', minHeight: '100vh' }}>{children}</div>
}
