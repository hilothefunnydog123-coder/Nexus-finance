import './arena.css'
import MarketBar from '@/components/arena/MarketBar'

export default function ArenaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ paddingBottom: 32 }}>
      {children}
      <MarketBar />
    </div>
  )
}
