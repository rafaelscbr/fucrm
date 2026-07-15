import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { initials } from '../lib/format'
import ThemeToggle from './ThemeToggle'
import { PresenceProvider } from '../context/PresenceContext'

const repNav = [
  { to: '/', label: 'Início', icon: '⌂', end: true },
  { to: '/clientes', label: 'Clientes', icon: '☰' },
  { to: '/funil', label: 'Funil', icon: '▤' },
]
const adminNav = [
  { to: '/admin', label: 'Painel', icon: '▧', end: true },
  { to: '/admin/aprovacoes', label: 'Aprovações', icon: '✓' },
  { to: '/admin/representantes', label: 'Representantes', icon: '◐' },
  { to: '/admin/territorios', label: 'Territórios', icon: '◭' },
  { to: '/admin/carteira', label: 'Carteira interna', icon: '⊘' },
  { to: '/admin/catalogo', label: 'Catálogo', icon: '▦' },
  { to: '/admin/condicoes', label: 'Condições pgto', icon: '≋' },
  { to: '/admin/empresa', label: 'Dados Fuplastic', icon: '▢' },
  { to: '/admin/importar', label: 'Importar', icon: '↧' },
  { to: '/admin/logs', label: 'Logs', icon: '☷' },
]

export default function Layout() {
  const { profile, signOut, isGestor } = useAuth()
  const cls = ({ isActive }) => (isActive ? 'on' : '')
  const bottom = isGestor ? [...repNav, { to: '/admin', label: 'Admin', icon: '▧', end: true }] : repNav

  return (
    <PresenceProvider>
    <div className="shell">
      <aside className="sidenav">
        <div className="brand"><span className="dot">FU</span><b>FuCRM</b></div>
        {repNav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={cls}><span className="ic">{n.icon}</span>{n.label}</NavLink>
        ))}
        {isGestor && (
          <>
            <div className="grp-lbl">Administração</div>
            {adminNav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={cls}><span className="ic">{n.icon}</span>{n.label}</NavLink>
            ))}
          </>
        )}
        <div className="spacer" />
        <button className="btn ghost" onClick={signOut}>Sair</button>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="t">FuCRM</span>
          <span className="muted" style={{ fontSize: 13 }}>{profile?.nome}</span>
          <ThemeToggle />
          <span className="av" title={profile?.nome}>{initials(profile?.nome)}</span>
        </header>
        <div className="content"><Outlet /></div>
      </div>

      <nav className="bottomnav">
        {bottom.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={cls}><span className="ic">{n.icon}</span>{n.label}</NavLink>
        ))}
      </nav>
    </div>
    </PresenceProvider>
  )
}
