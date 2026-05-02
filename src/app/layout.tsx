import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'YN Finance — Professional Trading Terminal',
  description: 'Real-time markets, community trade ideas, prop firm simulation, and live economic calendar — the trading hub for serious traders.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} style={{ background: '#040c14' }}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full overflow-hidden">
        {children}
        {/* Twitter/X widget — loads the embedded timeline on the Pulse tab */}
        <Script src="https://platform.twitter.com/widgets.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
