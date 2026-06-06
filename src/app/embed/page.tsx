'use client'

import { useState } from 'react'
import Link from 'next/link'
import SiteFooter from '@/components/SiteFooter'

const SNIPPET = `<iframe src="https://ynfinance.org/embed/analyzer"
  width="340" height="420" style="border:0;border-radius:12px;overflow:hidden"
  title="YN Finance AI Stock Analyzer" loading="lazy"></iframe>`

export default function EmbedDocs() {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(SNIPPET).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }).catch(() => {})
  }

  return (
    <div style={{ background: '#040a12', color: '#dce8f0', fontFamily: '"Inter",system-ui,sans-serif', minHeight: '100vh' }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}.lnk:hover{color:#00d4aa!important}`}</style>

      <nav style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(16px,4vw,40px)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: '#06121f' }}>YN</div>
          <span style={{ fontSize: 16, fontWeight: 800 }}>YN Finance</span>
        </Link>
        <Link href="/affiliates" className="lnk" style={{ fontSize: 13, color: '#6a8497', textDecoration: 'none', fontWeight: 600 }}>Affiliate Program →</Link>
      </nav>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '56px clamp(16px,4vw,24px) 80px' }}>
        <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '2px', color: '#00d4aa', border: '1px solid rgba(0,212,170,.3)', borderRadius: 100, padding: '6px 16px', marginBottom: 20 }}>FREE WIDGET</div>
        <h1 style={{ fontSize: 'clamp(30px,5vw,48px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.05, marginBottom: 16 }}>
          Put an AI stock analyzer on your site.
        </h1>
        <p style={{ fontSize: 16, color: '#6a8497', lineHeight: 1.7, maxWidth: 580, marginBottom: 40 }}>
          Drop this widget into any blog, Substack, Notion or Discord-linked page. Your readers get instant AI ratings; you get a tool that keeps them on your page. Free, no API key.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 28, alignItems: 'start' }}>
          {/* Snippet */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Copy this snippet</h2>
            <pre style={{ background: '#02060b', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '18px', fontSize: 12.5, color: '#9fe8d0', overflowX: 'auto', fontFamily: '"JetBrains Mono",ui-monospace,monospace', lineHeight: 1.6 }}>{SNIPPET}</pre>
            <button onClick={copy} style={{ marginTop: 14, background: copied ? 'rgba(0,212,170,.18)' : 'linear-gradient(135deg,#00d4aa,#1e90ff)', color: copied ? '#00d4aa' : '#06121f', border: copied ? '1px solid rgba(0,212,170,.5)' : 'none', padding: '12px 26px', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              {copied ? '✓ Copied!' : 'Copy embed code'}
            </button>
            <p style={{ fontSize: 12.5, color: '#3a5566', lineHeight: 1.7, marginTop: 22 }}>
              Want commission on everyone who upgrades through your widget? Join the <Link href="/affiliates" className="lnk" style={{ color: '#00d4aa', textDecoration: 'none' }}>affiliate program</Link> and earn 30% recurring.
            </p>
          </div>

          {/* Live preview */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Live preview</h2>
            <iframe src="/embed/analyzer" width="340" height="420" style={{ border: 0, borderRadius: 12, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,.5)' }} title="YN Finance AI Stock Analyzer preview" loading="lazy" />
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}
