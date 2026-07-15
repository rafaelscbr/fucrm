import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { brl } from '../../lib/format'

const FUNIL = [
  ['rascunho', 'Rascunho'], ['enviado', 'Enviado'], ['confirmado', 'Confirmado'],
  ['em_aprovacao', 'Em aprovação'], ['aprovado', 'Aprovado'], ['faturado', 'Faturado'],
]

export default function AdminDashboard() {
  const [orcs, setOrcs] = useState(null)
  useEffect(() => {
    supabase.from('orcamentos').select('status,valor_total,rep:profiles(nome)').then(({ data }) => setOrcs(data || []))
  }, [])
  if (orcs === null) return <div className="spinner" />

  const sum = (f) => orcs.filter(f).reduce((s, o) => s + Number(o.valor_total || 0), 0)
  const isPedido = (s) => ['aprovado', 'lancado_totvs', 'faturado'].includes(s)
  const faturado = sum((o) => o.status === 'faturado')
  const pedidos = sum((o) => isPedido(o.status))
  const emAprov = orcs.filter((o) => o.status === 'em_aprovacao').length
  const ativos = orcs.filter((o) => !['faturado', 'perdido', 'cancelado'].includes(o.status)).length

  const porRep = {}
  orcs.forEach((o) => {
    const n = o.rep?.nome || '—'
    porRep[n] = porRep[n] || { pedidos: 0, faturado: 0 }
    if (isPedido(o.status)) porRep[n].pedidos += Number(o.valor_total || 0)
    if (o.status === 'faturado') porRep[n].faturado += Number(o.valor_total || 0)
  })

  return (
    <div>
      <div className="page-head"><h1>Operação comercial</h1></div>
      <div className="metrics">
        <div className="metric accent"><div className="n">{brl(faturado)}</div><div className="k">Faturado</div></div>
        <div className="metric"><div className="n">{brl(pedidos)}</div><div className="k">Pedidos aprovados</div></div>
        <div className="metric"><div className="n">{ativos}</div><div className="k">Orçamentos ativos</div></div>
        <div className="metric"><div className="n">{emAprov}</div><div className="k">Aguardando aprovação</div></div>
      </div>

      <h3 style={{ fontSize: 16, margin: '6px 0 10px' }}>Funil por etapa</h3>
      <div className="board" style={{ marginBottom: 20 }}>
        {FUNIL.map(([st, l]) => (
          <div className="kcol" key={st} style={{ flex: '1 0 130px' }}>
            <div className="kh"><span>{l}</span><span className="c">{orcs.filter((o) => o.status === st).length}</span></div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{brl(sum((o) => o.status === st))}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 16, margin: '6px 0 10px' }}>Performance por representante</h3>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Representante</th><th>Pedidos</th><th>Faturado</th></tr></thead>
          <tbody>
            {Object.entries(porRep).map(([n, v]) => (
              <tr key={n}><td>{n}</td><td>{brl(v.pedidos)}</td><td>{brl(v.faturado)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
