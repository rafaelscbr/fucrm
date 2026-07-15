import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { dataBR } from '../lib/format'

export default function Dashboard() {
  const { profile, session } = useAuth()
  const nav = useNavigate()
  const [stats, setStats] = useState(null)
  const [acoes, setAcoes] = useState([])

  useEffect(() => {
    async function load() {
      const hoje = new Date().toISOString().slice(0, 10)
      const [clientes, interacoes, orcamentos, prox] = await Promise.all([
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('interacoes').select('id', { count: 'exact', head: true }),
        supabase.from('orcamentos').select('id', { count: 'exact', head: true }),
        supabase.from('interacoes')
          .select('id, proxima_acao, proxima_acao_data, cliente:clientes(id,razao_social)')
          .eq('representante_id', session.user.id)
          .not('proxima_acao', 'is', null)
          .gte('proxima_acao_data', hoje)
          .order('proxima_acao_data', { ascending: true })
          .limit(6),
      ])
      setStats({ clientes: clientes.count ?? 0, interacoes: interacoes.count ?? 0, orcamentos: orcamentos.count ?? 0 })
      setAcoes(prox.data || [])
    }
    load()
  }, [session])

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{saudacao}, {profile?.nome?.split(' ')[0]}</h1>
          <p className="muted" style={{ fontSize: 14 }}>Sua operação de hoje</p>
        </div>
      </div>

      <div className="metrics">
        <div className="metric"><div className="n">{stats?.clientes ?? '—'}</div><div className="k">Clientes</div></div>
        <div className="metric"><div className="n">{stats?.interacoes ?? '—'}</div><div className="k">Interações</div></div>
        <div className="metric"><div className="n">{stats?.orcamentos ?? '—'}</div><div className="k">Orçamentos</div></div>
        <div className="metric"><div className="n">{acoes.length}</div><div className="k">Próximas ações</div></div>
      </div>

      <h3 style={{ fontSize: 16, margin: '4px 0 12px' }}>Próximas ações</h3>
      {acoes.length === 0 ? (
        <div className="empty">Nada agendado. Registre uma visita e defina o próximo passo.</div>
      ) : (
        acoes.map((a) => (
          <button className="row" key={a.id} onClick={() => nav(`/clientes/${a.cliente?.id}`)}>
            <div className="grow">
              <div className="l1">{a.cliente?.razao_social}</div>
              <div className="l2">{a.proxima_acao}</div>
            </div>
            <span className="pill n">{dataBR(a.proxima_acao_data)}</span>
          </button>
        ))
      )}
    </div>
  )
}
