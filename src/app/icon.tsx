import { ImageResponse } from 'next/og'

export const size        = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width:          32,
          height:         32,
          borderRadius:   7,
          background:     'linear-gradient(135deg, #00d4aa 0%, #1e90ff 52%, #a855f7 100%)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          position:       'relative',
          overflow:       'hidden',
        }}
      >
        {/* Top sheen */}
        <div style={{
          position:   'absolute',
          top:        0,
          left:       0,
          right:      0,
          height:     15,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%)',
          display:    'flex',
          borderRadius: '7px 7px 0 0',
        }}/>
        {/* YN text */}
        <span style={{
          color:          'white',
          fontSize:       14,
          fontWeight:     900,
          fontFamily:     'system-ui, -apple-system, sans-serif',
          letterSpacing:  -0.8,
          lineHeight:     1,
        }}>
          YN
        </span>
      </div>
    ),
    { ...size }
  )
}
