import { useEffect, useState } from 'react'

// Botão "Instalar app" — aparece só quando o navegador permite instalar o PWA.
export default function InstallButton() {
  const [ev, setEv] = useState(null)
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setEv(e) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])
  if (!ev) return null
  return (
    <button className="btn ghost" style={{ width: '100%', marginBottom: 10 }}
      onClick={async () => { ev.prompt(); await ev.userChoice; setEv(null) }}>
      Instalar app
    </button>
  )
}
