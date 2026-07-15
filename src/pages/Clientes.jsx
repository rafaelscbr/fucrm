import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { tipoClienteLabel } from '../lib/format'
import PullToRefresh from '../components/PullToRefresh'
import Fab from '../components/Fab'

export default function Clientes() {
  const { session } = useAuth()
  const nav = useNavigate()
  const [clientes, setClientes] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('clientes')
      .select('id, razao_social, cidade, estado, tipo_cliente, bloqueado, representante_responsavel_id')
      .order('razao_social')
    setClientes(data || [])
  }, [])
  useEffect(() => { carregar() }, [carregar])

  if (clientes === null) return <div className="spinner" />

  const filtrados = clientes.filter((c) => {
    const t = (c.razao_social + ' ' + (c.cidade || '')).toLowerCase()
    if (!t.includes(busca.toLowerCase())) return false
    if (filtro === 'meus') return c.representante_responsavel_id === session?.user?.id
    if (filtro === 'bloqueados') return c.bloqueado
    return true
  })

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
          {[['todos', 'Todos'], ['meus', 'Minha carteira'], ['bloqueados', 'Bloqueados']].map(([v, l]) => (
            <button key={v} className={'tab ' + (filtro === v ? 'on' : '')} onClick={() => setFiltro(v)}>{l}</button>
          ))}
        </div>

        {filtrados.length === 0 ? (
          <div className="empty">Nenhum cliente aqui.</div>
        ) : (
          filtrados.map((c) => {
            const meu = c.representante_responsavel_id === session?.user?.id
            return (
              <button className="row" key={c.id} onClick={() => nav(`/clientes/${c.id}`)}>
                <div className="grow">
                  <div className="l1">{c.razao_social}</div>
                  <div className="l2">
                    {[c.cidade, c.estado].filter(Boolean).join(' · ')}
                    {c.tipo_cliente ? ` · ${tipoClienteLabel[c.tipo_cliente]}` : ''}
                  </div>
                </div>
                {c.bloqueado ? <span className="pill r">bloqueado</span> : meu ? <span className="pill g">meu</span> : <span className="pill w">outro rep</span>}
              </button>
            )
          })
        )}
      </PullToRefresh>
      <Fab to="/clientes/novo" label="Novo cliente" />
    </>
  )
}
