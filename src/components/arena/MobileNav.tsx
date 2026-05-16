'use client'

interface MobileNavProps {
  activeTab: string
  onChange: (tab: string) => void
}

const TABS = [
  { id: 'competition', label: 'Compete', icon: '🏆' },
  { id: 'streams',     label: 'Streams', icon: '📺' },
  { id: 'leaderboard', label: 'Board',  icon: '🏅' },
]

export default function MobileNav({ activeTab, onChange }: MobileNavProps) {
  return (
    <>
      {/* Only render on mobile — hidden via CSS above 768px */}
      <nav
        style={{
          position: 'fixed',
          bottom: 32,
          left: 0,
          right: 0,
          height: 56,
          zIndex: 90,
          background: '#040508',
          borderTop: '1px solid #21262d',
          display: 'flex',
          alignItems: 'stretch',
        }}
        className="yn-mobile-nav"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 0',
                color: isActive ? '#22c55e' : '#4a5e7a',
                transition: 'color 0.15s',
              }}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Hide on desktop */}
      <style>{`
        @media (min-width: 769px) {
          .yn-mobile-nav { display: none !important; }
        }
      `}</style>
    </>
  )
}
