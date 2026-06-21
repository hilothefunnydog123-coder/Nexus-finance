import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Enter the Net — Fly Inside the AI as It Forecasts a Stock',
  description: 'A WebGL flythrough inside BrainStock’s neural network. Type a ticker and watch the real forward-pass fire through every layer in real time — scored live with sound. Nothing in finance looks like this.',
  alternates: { canonical: 'https://ynfinance.org/brain/live' },
  openGraph: { url: 'https://ynfinance.org/brain/live', title: 'Enter the Net — YN Finance' },
}

export default function BrainLiveLayout({ children }: { children: React.ReactNode }) {
  return children
}
