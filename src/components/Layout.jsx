import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { initials } from '../lib/format'
import ThemeToggle from './ThemeToggle'
import Icon from './Icon'
import { PresenceProvider } from '../context/PresenceContext'
import InstallButton from './InstallButton'
import NotificationBell from './NotificationBell'

const repNav = [
  { to: '/', label: 'Início', icon: 'home', end: true },
  { to: '/clientes', label: 'Clientes', icon: 'clientes' },
  { to: '/prospeccao', label: 'Prospecção', icon: 'prospeccao' },
  { to: '/funil', label: 'Vendas', icon: 'funil' },
]
const adminNav = [
  { to: '/admin/aprovacoes', label: 'Cadastro TOTVS', icon: 'aprovacoes' },
  { to: '/admin/metas', label: 'Metas & Ranking', icon: 'metas' },
  { to: '/admin/representantes', label: 'Representantes', icon: 'reps' },
  { to: '/admin/territorios', label: 'Territórios', icon: 'territorios' },
  { to: '/admin/carteira', label: 'Carteira interna', icon: 'carteira' },
  { to: '/admin/catalogo', label: 'Catálogo', icon: 'catalogo' },
  { to: '/admin/condicoes', label: 'Condições pgto', icon: 'condicoes' },
  { to: '/admin/empresa', label: 'Dados Fuplastic', icon: 'empresa' },
  { to: '/admin/importar', label: 'Importar', icon: 'importar' },
  { to: '/admin/logs', label: 'Logs', icon: 'logs' },
]

function tituloDe(path, isGestor) {
  if (path === '/') return isGestor ? 'Painel da operação' : 'Início'
  const mapa = [
    ['/clientes/novo', 'Novo cliente'], ['/clientes', 'Clientes'], ['/orcamentos/novo', 'Novo orçamento'],
    ['/orcamentos', 'Orçamento'], ['/funil', 'Funil'], ['/admin/aprovacoes', 'Aprovações'],
    ['/admin/representantes', 'Representantes'], ['/admin/territorios', 'Territórios'],
    ['/admin/carteira', 'Carteira interna'], ['/admin/catalogo', 'Catálogo'], ['/admin/condicoes', 'Condições de pagamento'],
    ['/admin/empresa', 'Dados Fuplastic'], ['/admin/importar', 'Importar carteira'], ['/admin/logs', 'Logs'],
  ]
  return (mapa.find(([p]) => path.startsWith(p)) || [null, 'FuCRM'])[1]
}

export default function Layout() {
  const { profile, signOut, isGestor } = useAuth()
  const loc = useLocation()
  const cls = ({ isActive }) => (isActive ? 'on' : '')
  const bottom = isGestor ? [...repNav, { to: '/admin/aprovacoes', label: 'TOTVS', icon: 'aprovacoes' }] : repNav

  return (
    <PresenceProvider>
      <div className="shell">
        <aside className="sidenav">
          <div className="brand"><span className="dot">FU</span><b>FuCRM</b></div>
          {repNav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={cls}><Icon name={n.icon} />{n.label}</NavLink>
          ))}
          {isGestor && (
            <>
              <div className="grp-lbl">Administração</div>
              {adminNav.map((n) => (
                <NavLink key={n.to} to={n.to} className={cls}><Icon name={n.icon} />{n.label}</NavLink>
              ))}
            </>
          )}
          <div className="spacer" />
          <InstallButton />
          <div className="me">
            <span className="av">{initials(profile?.nome)}</span>
            <div className="mi">
              <div className="mn">{profile?.nome}</div>
              <div className="mp">{profile?.papel}</div>
            </div>
            <button className="icon-btn" onClick={signOut} title="Sair" aria-label="Sair"><Icon name="sair" size={17} /></button>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <span className="t">{tituloDe(loc.pathname, isGestor)}</span>
            <NotificationBell />
            <ThemeToggle />
            <span className="av av-top" title={profile?.nome}>{initials(profile?.nome)}</span>
          </header>
          <div className="content"><Outlet /></div>
        </div>

        <nav className="bottomnav">
          {bottom.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={cls}><span className="ic"><Icon name={n.icon} size={20} /></span>{n.label}</NavLink>
          ))}
        </nav>
      </div>
    </PresenceProvider>
  )
}
