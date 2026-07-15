import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const nav = [
  { to: '/', label: 'Início', icon: '⌂', end: true },
  { to: '/clientes', label: 'Clientes', icon: '☰' },
  { to: '/funil', label: 'Funil', icon: '▤' },
]

function initials(name = '?') {
  return name.trim().slice(0, 2).toUpperCase()
}

export default function Layout() {
  const { profile, signOut } = useAuth()

  return (
    <div className="shell">
      <aside className="sidenav">
        <div className="brand">
          <span className="dot">Fu</span>
          <b>FuCRM</b>
        </div>
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'on' : '')}>
            <span className="ic">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
        <div className="spacer" />
        <button className="btn ghost" onClick={signOut}>Sair</button>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="t">FuCRM</span>
          <span className="muted" style={{ fontSize: 13 }}>{profile?.nome}</span>
          <span className="av" title={profile?.nome}>{initials(profile?.nome)}</span>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>

      <nav className="bottomnav">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'on' : '')}>
            <span className="ic">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
