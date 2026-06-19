import { PaperPage, PageHero, Section, Reveal, Magnetic, INK, MUTE, LINE, PAPER, BONE, ACCENT } from '@/components/cinematic/Paper'

export const metadata = { title: 'Careers — YN Finance', description: 'We hire by merit, not age. Join a real startup with real users and real stakes.' }

const WHY = [
  { icon: '🏗️', t: 'Real product, real users', d: 'You won’t build features nobody uses. Active traders depend on what we ship every week.' },
  { icon: '📈', t: 'Learn from the best', d: 'Nine world-class trading instructors built careers on this edge. You’ll have direct access to them.' },
  { icon: '🌍', t: 'Instant reach', d: 'Your first pull request ships to thousands of traders. Not a prototype — production.' },
  { icon: '💎', t: 'Equity & growth', d: 'We share the upside. Early team members receive equity in YN Finance Corp. This isn’t an internship.' },
]
const ROLES = [
  { title: 'Head of Growth', type: 'PART-TIME', loc: 'Remote', desc: ['Own acquisition: SEO, content loops, community flywheels.', 'Run experiments on onboarding — we have data, we need someone to read it.', 'You’ve grown a product to 10K+ users before, or you have a plan to.'] },
  { title: 'Machine Learning Engineer', type: 'PART-TIME', loc: 'Remote', desc: ['Improve our AI analyzer prompts and multi-agent orchestration.', 'Build smarter signal detection in our Intelligence Suite.', 'You read AI papers for fun. You ship models, not slide decks.'] },
  { title: 'Content & Community Lead', type: 'PART-TIME', loc: 'Remote', desc: ['Write trading breakdowns, tool tutorials, and weekly edge reports.', 'Moderate and grow the YN Finance community across platforms.', 'You understand markets and can explain them without dumbing them down.'] },
  { title: 'Partnerships Manager', type: 'PART-TIME', loc: 'Remote', desc: ['Source and close deals with prop firms, trading educators, and brokers.', 'Manage our instructor partner relationships (9 world-class traders).', 'You don’t count rejections — the 47th no is just setup for the yes.'] },
]
const CULTURE = [
  'We ship fast. Fast beats perfect in markets and startups.',
  'We don’t have meetings about meetings. Every async update is a decision.',
  'Your pull request speaks louder than your resume. Show us what you’ve built.',
  'We respect time zones. Results matter more than being online at 9 AM.',
  'Nobody here is waiting for permission. If you see a problem, fix it.',
]
const PERKS = ['📊 Equity in YN Finance Corp.', '🌐 Fully remote, async-first', '📚 Learning budget for courses', '🎓 Access to 9 world-class educators', '⚡ Ship on day one — real users', '🔑 Full platform access, forever', '📰 Your name in the changelog', '🚀 Ground floor of a real startup']

export default function CareersPage() {
  return (
    <PaperPage>
      <PageHero
        eyebrow="// WE’RE HIRING"
        title="We hire by merit, not age."
        accentWords={[4]}
        sub="We’re 14. If you’re better at something than we are, we want you. YN Finance is a real startup with real users and real stakes — your work reaches thousands of traders on day one."
      />

      <Section bg={PAPER}>
        <Reveal><div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.2em', color: ACCENT, marginBottom: 14 }}>// WHY YN FINANCE</div></Reveal>
        <Reveal delay={80}><h2 className="disp" style={{ fontSize: 'clamp(1.6rem,3.4vw,2.6rem)', marginBottom: 36 }}>Four reasons to work with us.</h2></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 16 }}>
          {WHY.map((w, i) => (
            <Reveal key={w.t} delay={i * 80}>
              <div data-spotlight style={{ background: BONE, border: `1px solid ${LINE}`, padding: '26px 24px', height: '100%' }}>
                <div style={{ fontSize: 26, marginBottom: 12 }}>{w.icon}</div>
                <div className="disp" style={{ fontSize: '1.2rem', marginBottom: 8 }}>{w.t}</div>
                <p style={{ fontSize: 14, color: MUTE, lineHeight: 1.65 }}>{w.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <Reveal><div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.2em', color: ACCENT, marginBottom: 14 }}>// OPEN ROLES · REMOTE-FIRST</div></Reveal>
        <Reveal delay={80}><h2 className="disp" style={{ fontSize: 'clamp(1.6rem,3.4vw,2.6rem)', marginBottom: 36 }}>Current openings.</h2></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
          {ROLES.map((r, i) => (
            <Reveal key={r.title} delay={i * 80}>
              <div style={{ background: PAPER, border: `1px solid ${LINE}`, padding: '26px 26px 22px', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  <div>
                    <h3 className="disp" style={{ fontSize: '1.3rem', marginBottom: 8 }}>{r.title}</h3>
                    <div style={{ display: 'flex', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>
                      <span style={{ color: ACCENT, border: `1px solid rgba(31,59,255,.3)`, padding: '3px 9px', letterSpacing: '0.1em' }}>{r.type}</span>
                      <span style={{ color: MUTE, border: `1px solid ${LINE}`, padding: '3px 9px', letterSpacing: '0.1em' }}>📍 {r.loc}</span>
                    </div>
                  </div>
                  <a href="mailto:careers@ynfinance.org" style={{ fontSize: 12, fontWeight: 700, color: PAPER, background: INK, padding: '9px 18px', textDecoration: 'none', flexShrink: 0, height: 'fit-content' }}>Apply →</a>
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7, padding: 0, margin: 0 }}>
                  {r.desc.map((d, j) => (
                    <li key={j} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: MUTE, lineHeight: 1.6 }}><span style={{ color: ACCENT, flexShrink: 0 }}>—</span>{d}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section bg={PAPER}>
        <Reveal><div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.2em', color: ACCENT, marginBottom: 14 }}>// CULTURE</div></Reveal>
        <Reveal delay={80}><h2 className="disp" style={{ fontSize: 'clamp(1.6rem,3.4vw,2.6rem)', marginBottom: 32 }}>How we work.</h2></Reveal>
        <div style={{ maxWidth: 800, display: 'flex', flexDirection: 'column' }}>
          {CULTURE.map((t, i) => (
            <Reveal key={i}>
              <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', padding: '20px 0', borderTop: `1px solid ${LINE}` }}>
                <span className="disp" style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', color: 'rgba(10,10,12,.18)', minWidth: '1.4em' }}>0{i + 1}</span>
                <p style={{ fontSize: 'clamp(1rem,1.6vw,1.2rem)', color: INK, lineHeight: 1.5, paddingTop: 4 }}>{t}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <Reveal><div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.2em', color: ACCENT, marginBottom: 24 }}>// PERKS</div></Reveal>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {PERKS.map((p) => <Reveal key={p}><span style={{ display: 'inline-block', fontSize: 13.5, fontWeight: 600, color: INK, background: PAPER, border: `1px solid ${LINE}`, padding: '11px 18px' }}>{p}</span></Reveal>)}
        </div>
      </Section>

      <Section bg={PAPER}>
        <Reveal style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
          <h2 className="disp" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', marginBottom: 12 }}>Don’t see your role?</h2>
          <p style={{ fontSize: 16, color: MUTE, marginBottom: 28 }}>If you have a skill we need and a body of work to show, reach out anyway.</p>
          <Magnetic href="mailto:careers@ynfinance.org" style={{ gap: 8, background: INK, color: PAPER, padding: '16px 32px', fontSize: 15, fontWeight: 700 }}>Email careers@ynfinance.org</Magnetic>
        </Reveal>
      </Section>
    </PaperPage>
  )
}
