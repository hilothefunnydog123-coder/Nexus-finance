import { Skeleton, SkeletonStyles } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div style={{ background: '#040a12', color: '#dce8f0', fontFamily: '"Inter",system-ui,sans-serif', minHeight: '100vh' }}>
      <SkeletonStyles />
      <nav style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(16px,4vw,40px)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Skeleton w={28} h={28} r={8} />
          <Skeleton w={90} h={16} />
        </div>
        <Skeleton w={140} h={34} r={10} />
      </nav>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '36px clamp(16px,4vw,24px) 80px' }}>
        <Skeleton w={200} h={12} style={{ marginBottom: 28 }} />
        <Skeleton w="55%" h={40} style={{ marginBottom: 36 }} />
        {/* two-column comparison rows */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr', gap: 16, alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            <Skeleton h={20} />
            <Skeleton w={90} h={11} style={{ margin: '0 auto' }} />
            <Skeleton h={20} />
          </div>
        ))}
        <Skeleton h={200} r={14} style={{ marginTop: 32 }} />
      </div>
    </div>
  )
}
