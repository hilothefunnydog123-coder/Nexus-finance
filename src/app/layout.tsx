import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import CineFX from '@/components/cinematic/CineFX'
import AnalyticsBeacon from '@/components/AnalyticsBeacon'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-display' })

const BASE_URL = 'https://ynfinance.org'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'YN Finance — Learn to Trade for $0.99',
    template: '%s | YN Finance',
  },
  description: 'Learn from Ross Cameron, ICT, Graham Stephan & 6 more world-class traders for $0.99 per course. Built-in trading simulator, prop firm challenges, and live market data.',
  keywords: ['ynfinance', 'yn finance', 'YN Finance', 'trading courses', 'learn to trade', 'prop firm', 'day trading', 'trading simulator', 'stock market education', 'Ross Cameron', 'ICT trading', 'trading app', 'prop firm challenge', 'trading education platform', 'AI stock analyzer'],
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
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} h-full`} style={{ background: '#040c14' }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

        {/* Favicon — ?v= busts the per-domain browser favicon cache */}
        <link rel="icon"          type="image/png" href="/icon.png?v=3" sizes="32x32" />
        <link rel="shortcut icon" type="image/png" href="/icon.png?v=3" />

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#22c55e" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="YN Arena" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="preconnect" href="https://s3.tradingview.com" />
        <link rel="dns-prefetch" href="https://s3.tradingview.com" />
        {/* JSON-LD — tells Google exactly who YN Finance is */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'YN Finance',
          alternateName: ['ynfinance', 'YNFinance'],
          url: 'https://ynfinance.org',
          logo: 'https://ynfinance.org/icon.png',
          description: 'AI-powered trading education platform. Learn from world-class traders for $0.99 per course. Built-in prop firm challenges, live market data, and 9-agent AI intelligence network.',
          sameAs: ['https://twitter.com/ynfinance'],
          contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: 'support@ynfinance.org' },
        }) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'YN Finance',
          url: 'https://ynfinance.org',
          potentialAction: { '@type': 'SearchAction', target: 'https://ynfinance.org/ai-stocks?q={search_term_string}', 'query-input': 'required name=search_term_string' },
        }) }} />
      </head>
      <body className="h-full">
        <CineFX />
        <AnalyticsBeacon />
        {children}
        {/* Twitter/X widget — loads the embedded timeline on the Pulse tab */}
        <Script src="https://platform.twitter.com/widgets.js" strategy="afterInteractive" />
        <script dangerouslySetInnerHTML={{ __html: `
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
  }
`}} />
      </body>
    </html>
  )
}
