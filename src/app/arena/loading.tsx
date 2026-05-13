export default function ArenaLoading() {
  return (
    <div style={{ background: '#040508', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Skeleton ticker */}
      <div style={{ height: 34, background: '#0d1117', borderBottom: '1px solid #21262d' }} />
      {/* Skeleton nav */}
      <div style={{ height: 56, background: 'rgba(4,5,8,0.94)', borderBottom: '1px solid #21262d' }} />
      {/* Skeleton content */}
      <div style={{ maxWidth: 1200, margin: '40px auto', padding: '0 24px', width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[300, 200, 400, 150].map((h, i) => (
          <div
            key={i}
            style={{
              height: h,
              borderRadius: 12,
              background: '#0d1117',
              border: '1px solid #21262d',
              animation: 'skeleton 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      <style>{`@keyframes skeleton { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
    </div>
  )
}
