import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function load() {
      const [clientes, interacoes, orcamentos] = await Promise.all([
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('interacoes').select('id', { count: 'exact', head: true }),
        supabase.from('orcamentos').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        clientes: clientes.count ?? 0,
        interacoes: interacoes.count ?? 0,
        orcamentos: orcamentos.count ?? 0,
      })
    }
    load()
  }, [])

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
        <div className="metric"><div className="n">0</div><div className="k">Aniversários hoje</div></div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Bem-vindo ao FuCRM 🌱</h3>
        <p className="muted" style={{ fontSize: 14 }}>
          O sistema está no ar e conectado ao banco. As próximas telas — registro de visita em 30s,
          ficha de relacionamento, orçamento e Kanban — entram em seguida.
        </p>
      </div>
    </div>
  )
}
