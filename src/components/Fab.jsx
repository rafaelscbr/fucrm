import { useNavigate } from 'react-router-dom'

// Botão de ação flutuante — ação principal ao alcance do polegar (mobile).
export default function Fab({ to, label = 'Novo', onClick }) {
  const nav = useNavigate()
  function handle() {
    try { if (navigator.vibrate) navigator.vibrate(10) } catch { /* ignore */ }
    if (onClick) onClick()
    else if (to) nav(to)
  }
  return (
    <button className="fab-btn" onClick={handle} aria-label={label}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      <span className="fab-label">{label}</span>
    </button>
  )
}
