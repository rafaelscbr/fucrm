import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { tipoClienteLabel } from '../lib/format'
import { coordCliente } from '../lib/cidades'
import { distanciaKm } from '../lib/rapport'
import PullToRefresh from '../components/PullToRefresh'
import Fab from '../components/Fab'

export default function Clientes() {
  const { session } = useAuth()
  const nav = useNavigate()
  const [clientes, setClientes] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [userCoord, setUserCoord] = useState(null)
  const [orcMap, setOrcMap] = useState({})

  const carregar = useCallback(async () => {
    const [{ data: cs }, { data: orcs }] = await Promise.all([
      supabase.from('clientes')
        .select('id, razao_social, cidade, estado, tipo_cliente, bloqueado, representante_responsavel_id, lat, lng')
        .order('razao_social'),
      supabase.from('orcamentos').select('cliente_id, status'),
    ])
    const map = {}
    ;(orcs || []).forEach((o) => {
      const m = map[o.cliente_id] || { count: 0, ganho: false, ativo: false }
      m.count++
      if (['lancado_totvs', 'faturado'].includes(o.status)) m.ganho = true
      else if (!['perdido', 'cancelado'].includes(o.status)) m.ativo = true
      map[o.cliente_id] = m
    })
    setOrcMap(map)
    setClientes(cs || [])
  }, [])
  useEffect(() => { carregar() }, [carregar])

  function ativarPerto() {
    setFiltro('perto')
    if (!userCoord && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserCoord([p.coords.longitude, p.coords.latitude]),
        () => {},
      )
    }
  }

  if (clientes === null) return <div className="spinner" />

  const filtrados = clientes.filter((c) => {
    const t = (c.razao_social + ' ' + (c.cidade || '')).toLowerCase()
    if (!t.includes(busca.toLowerCase())) return false
    if (filtro === 'meus') return c.representante_responsavel_id === session?.user?.id
    if (filtro === 'bloqueados') return c.bloqueado
    return true
  })
  let lista = filtrados
  if (filtro === 'perto' && userCoord) {
    lista = filtrados.map((c) => ({ ...c, _d: distanciaKm(userCoord, coordCliente(c)) })).sort((a, b) => a._d - b._d)
  }

  return (
    <>
      <PullToRefresh onRefresh={carregar}>
        <div className="page-head">
          <h1>Clientes</h1>
          <Link className="btn no-mobile-inline" to="/clientes/novo">＋ Novo</Link>
        </div>
        <div className="toolbar">
          <input className="input" placeholder="Buscar por nome ou cidade…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="tabs">
          {[['todos', 'Todos'], ['meus', 'Minha carteira'], ['perto', 'Perto de mim'], ['bloqueados', 'Bloqueados']].map(([v, l]) => (
            <button key={v} className={'tab ' + (filtro === v ? 'on' : '')} onClick={() => (v === 'perto' ? ativarPerto() : setFiltro(v))}>{l}</button>
          ))}
        </div>

        {filtro === 'perto' && !userCoord ? (
          <div className="empty">Permita o acesso à localização para ver os clientes mais próximos.</div>
        ) : lista.length === 0 ? (
          <div className="empty">Nenhum cliente aqui.</div>
        ) : (
          lista.map((c) => {
            const meu = c.representante_responsavel_id === session?.user?.id
            return (
              <button className="row" key={c.id} onClick={() => nav(`/clientes/${c.id}`)}>
                <div className="grow">
                  <div className="l1">{c.razao_social}</div>
                  <div className="l2">
                    {[c.cidade, c.estado].filter(Boolean).join(' · ')}
                    {c._d != null && isFinite(c._d) ? ` · ${Math.round(c._d)} km` : ''}
                    {c.tipo_cliente ? ` · ${tipoClienteLabel[c.tipo_cliente]}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {orcMap[c.id] && <span className={'pill ' + (orcMap[c.id].ganho ? 'g' : orcMap[c.id].ativo ? 'i' : 'n')}>{orcMap[c.id].count} orç.</span>}
                  {c.bloqueado ? <span className="pill r">bloqueado</span> : meu ? <span className="pill g">meu</span> : <span className="pill w">outro rep</span>}
                </div>
              </button>
            )
          })
        )}
      </PullToRefresh>
      <Fab to="/clientes/novo" label="Novo cliente" />
    </>
  )
}
