import { Skeleton, SkeletonStyles } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(1100px 560px at 12% -8%, rgba(34,211,238,.12), transparent 55%), radial-gradient(1000px 520px at 92% 0%, rgba(167,139,250,.14), transparent 52%), #070b14',
        color: '#e7ecf5',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <SkeletonStyles />
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 22px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
          <Skeleton w={120} h={18} />
          <Skeleton w={130} h={36} r={10} />
        </div>
        <Skeleton w="45%" h={44} style={{ marginBottom: 14 }} />
        <Skeleton w="65%" h={18} style={{ marginBottom: 36 }} />
        {/* forecast chart */}
        <div style={{ margin: '28px 0', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, padding: 16 }}>
          <Skeleton h={200} r={12} />
        </div>
        {/* metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: 18 }}>
              <Skeleton w={80} h={11} style={{ marginBottom: 12 }} />
              <Skeleton w={100} h={24} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
