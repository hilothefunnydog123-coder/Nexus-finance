import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The 30-Second Demo',
  description: 'Watch the whole loop in 30 seconds — BrainStock forecasts the market, the AI analyzer reads a ticker, the War Room debates it, every call is graded in public, and the edge compounds.',
  alternates: { canonical: 'https://ynfinance.org/demo' },
  openGraph: { url: 'https://ynfinance.org/demo', title: 'The 30-Second Demo — YN Finance' },
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children
}
