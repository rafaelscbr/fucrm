import { createContext, useContext, useCallback, useState } from 'react'

const ToastCtx = createContext(() => {})

function haptic(ms = 12) {
  try { if (navigator.vibrate) navigator.vibrate(ms) } catch { /* ignore */ }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((msg, tipo = 'ok') => {
    const id = Math.random().toString(36).slice(2)
    haptic(tipo === 'erro' ? [10, 40, 10] : 14)
    setToasts((t) => [...t, { id, msg, tipo }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div className={'toast ' + t.tipo} key={t.id}>
            <span className="ic" aria-hidden="true">{t.tipo === 'erro' ? '!' : '✓'}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
