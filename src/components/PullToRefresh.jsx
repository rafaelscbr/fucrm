import { useRef, useState } from 'react'

// Puxar-para-atualizar (mobile). Envolve o conteúdo de uma lista/tela.
export default function PullToRefresh({ onRefresh, children }) {
  const [dist, setDist] = useState(0)
  const [carregando, setCarregando] = useState(false)
  const startY = useRef(null)
  const LIMITE = 72

  function onStart(e) {
    if (window.scrollY <= 0 && !carregando) startY.current = e.touches[0].clientY
    else startY.current = null
  }
  function onMove(e) {
    if (startY.current == null) return
    const d = e.touches[0].clientY - startY.current
    if (d > 0) setDist(Math.min(d * 0.5, 90))
  }
  async function onEnd() {
    if (dist >= LIMITE && onRefresh) {
      setCarregando(true)
      try { if (navigator.vibrate) navigator.vibrate(14) } catch { /* ignore */ }
      try { await onRefresh() } finally { setCarregando(false) }
    }
    setDist(0); startY.current = null
  }

  const ativo = dist > 4 || carregando
  return (
    <div onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}>
      <div className="ptr" style={{ height: carregando ? 44 : dist, opacity: ativo ? 1 : 0 }}>
        <span className={'ptr-spin' + (carregando ? ' on' : '')}
          style={{ transform: `rotate(${carregando ? 0 : dist * 3}deg)` }} />
        <span className="ptr-txt">{carregando ? 'Atualizando…' : dist >= LIMITE ? 'Solte para atualizar' : 'Puxe para atualizar'}</span>
      </div>
      <div style={{ transform: `translateY(${carregando ? 0 : dist * 0.3}px)`, transition: startY.current ? 'none' : 'transform .2s' }}>
        {children}
      </div>
    </div>
  )
}
