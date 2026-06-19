import type { Metadata } from 'next'
import Link from 'next/link'
import { COMPARE_PAIRS } from '@/lib/stockSeo'
import { PaperPage, PageHero, Section, Reveal, INK, LINE, PAPER } from '@/components/cinematic/Paper'

export const revalidate = 86400
const BASE = 'https://ynfinance.org'

export const metadata: Metadata = {
  title: 'Compare Stocks Head-to-Head — AI Verdicts | YN Finance',
  description: 'Compare any two stocks side by side — price, valuation, momentum and analyst consensus — then get a free AI rating on each. AAPL vs MSFT, NVDA vs AMD and more.',
  alternates: { canonical: `${BASE}/compare` },
}

export default function CompareIndex() {
  return (
    <PaperPage>
      <PageHero
        eyebrow="// HEAD TO HEAD"
        title="Compare stocks, side by side."
        accentWords={[1]}
        sub="Two stocks, valuation, momentum and analyst consensus — with a free AI verdict on each. Pick a matchup."
      />
      <Section style={{ paddingTop: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 12 }}>
          {COMPARE_PAIRS.map(([a, b], i) => (
            <Reveal key={`${a}${b}`} delay={(i % 6) * 50}>
              <Link href={`/compare/${a.toLowerCase()}-vs-${b.toLowerCase()}`} data-spotlight style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: INK, background: PAPER, border: `1px solid ${LINE}`, padding: '20px 12px', textDecoration: 'none', transition: 'border-color .2s, transform .2s' }}
                onMouseEnter={undefined}>
                {a} <span style={{ fontSize: 11, color: 'rgba(10,10,12,.4)' }}>vs</span> {b}
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>
    </PaperPage>
  )
}
