export const metadata = { title: 'YN AI — Trading Assistant' }

export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { height: 100%; overflow: hidden; background: #030a10; font-family: "Inter", system-ui, sans-serif; }
          ::-webkit-scrollbar { width: 3px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #1a2d4a; border-radius: 4px; }
          @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0} }
          @keyframes pulse-r { 0%,100%{box-shadow:0 0 0 0 rgba(255,45,120,.4)} 70%{box-shadow:0 0 0 8px rgba(255,45,120,0)} }
          @keyframes pulse-g { 0%,100%{box-shadow:0 0 0 0 rgba(0,212,170,.4)} 70%{box-shadow:0 0 0 8px rgba(0,212,170,0)} }
          @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
          @keyframes dot     { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
          @keyframes wave    { 0%,100%{transform:scaleY(0.4)} 50%{transform:scaleY(1)} }
        `}</style>
      </head>
      <body style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#030a10', color: '#dce8f0', margin: 0 }}>
        {children}
      </body>
    </html>
  )
}
