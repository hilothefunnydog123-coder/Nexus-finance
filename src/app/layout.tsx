import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const BASE_URL = 'https://ynfinance.org'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'YN Finance — Learn to Trade for $0.99',
    template: '%s | YN Finance',
  },
  description: 'Learn from Ross Cameron, ICT, Graham Stephan & 6 more world-class traders for $0.99 per course. Built-in trading simulator, prop firm challenges, and live market data.',
  keywords: ['trading courses', 'learn to trade', 'prop firm', 'day trading', 'Ross Cameron', 'ICT trading', 'trading simulator', 'stock market education'],
  authors: [{ name: 'YN Finance', url: BASE_URL }],
  creator: 'YN Finance',
  openGraph: {
    type: 'website',
    url: BASE_URL,
    siteName: 'YN Finance',
    title: 'Learn to Trade for $0.99 — YN Finance',
    description: 'Ross Cameron. ICT. Graham Stephan. 9 world-class traders. $0.99 per course. Practice on real charts the moment you finish a section.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'YN Finance — Learn to Trade' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@ynfinance',
    title: 'Learn to Trade for $0.99 — YN Finance',
    description: 'Ross Cameron. ICT. Graham Stephan. 9 world-class traders. $0.99 per course. Practice immediately on real charts.',
    images: ['/opengraph-image'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: BASE_URL },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} style={{ background: '#040c14' }}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="preconnect" href="https://s3.tradingview.com" />
        <link rel="dns-prefetch" href="https://s3.tradingview.com" />
      </head>
      <body className="h-full">
        {children}
        {/* Twitter/X widget — loads the embedded timeline on the Pulse tab */}
        <Script src="https://platform.twitter.com/widgets.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
