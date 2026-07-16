import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const Ctx = createContext({ online: [] })

function telaLabel(path) {
  if (path === '/') return 'Início'
  if (path.startsWith('/clientes')) return 'Clientes'
  if (path.startsWith('/rota')) return 'Rota do dia'
  if (path.startsWith('/orcamentos')) return 'Orçamento'
  if (path.startsWith('/funil')) return 'Funil'
  if (path.startsWith('/admin/aprovacoes')) return 'Aprovações'
  if (path.startsWith('/admin/representantes')) return 'Representantes'
  if (path.startsWith('/admin/territorios')) return 'Territórios'
  if (path.startsWith('/admin/carteira')) return 'Carteira interna'
  if (path.startsWith('/admin/catalogo')) return 'Catálogo'
  if (path.startsWith('/admin/condicoes')) return 'Condições'
  if (path.startsWith('/admin/empresa')) return 'Dados Fuplastic'
  if (path.startsWith('/admin/importar')) return 'Importar'
  if (path.startsWith('/admin/logs')) return 'Logs'
  if (path.startsWith('/admin')) return 'Painel'
  return path
}

export function PresenceProvider({ children }) {
  const { session, profile } = useAuth()
  const loc = useLocation()
  const [online, setOnline] = useState([])
  const chanRef = useRef(null)

  useEffect(() => {
    if (!session?.user || !profile) return
    const ch = supabase.channel('online-users', { config: { presence: { key: session.user.id } } })
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState()
      setOnline(Object.values(state).map((arr) => arr[0]).filter(Boolean))
    })
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ch.track({ id: session.user.id, nome: profile.nome, papel: profile.papel, tela: telaLabel(window.location.pathname) })
      }
    })
    chanRef.current = ch
    return () => { supabase.removeChannel(ch); chanRef.current = null }
  }, [session?.user?.id, profile?.id])

  useEffect(() => {
    if (chanRef.current && profile) {
      chanRef.current.track({ id: session.user.id, nome: profile.nome, papel: profile.papel, tela: telaLabel(loc.pathname) })
    }
  }, [loc.pathname])

  return <Ctx.Provider value={{ online }}>{children}</Ctx.Provider>
}

export const usePresence = () => useContext(Ctx)
