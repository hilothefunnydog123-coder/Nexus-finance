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
        <Skeleton w={220} h={12} style={{ marginBottom: 28 }} />
        <Skeleton w="60%" h={40} style={{ marginBottom: 14 }} />
        <Skeleton w="40%" h={20} style={{ marginBottom: 36 }} />
        {/* stat grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 36 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: 16 }}>
              <Skeleton w={70} h={11} style={{ marginBottom: 12 }} />
              <Skeleton w={90} h={20} />
            </div>
          ))}
        </div>
        <Skeleton h={260} r={14} style={{ marginBottom: 28 }} />
        <Skeleton w="50%" h={24} style={{ marginBottom: 16 }} />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} h={64} r={10} style={{ marginBottom: 12 }} />
        ))}
      </div>
    </div>
  )
}
