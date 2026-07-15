import { useState } from 'react'

function currentTheme() {
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr) return attr
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme())

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('fucrm-theme', next) } catch (e) { /* ignore */ }
    setTheme(next)
  }

  return (
    <button className="theme-toggle" onClick={toggle}
      title={theme === 'light' ? 'Mudar para escuro' : 'Mudar para claro'} aria-label="Alternar tema">
      {theme === 'light' ? '☾' : '☀'}
    </button>
  )
}
