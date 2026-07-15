import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { brl } from '../../lib/format'

const STATUS = [
  ['rascunho', 'Rascunho', '#8a8d84'],
  ['enviado', 'Enviado', '#5aa2f0'],
  ['confirmado', 'Confirmado', '#7c6ff0'],
  ['em_aprovacao', 'Em aprovação', '#e3a53a'],
  ['aprovado', 'Aprovado', '#26d451'],
  ['lancado_totvs', 'Lançado TOTVS', '#12a03a'],
  ['faturado', 'Faturado', '#00c53a'],
  ['perdido', 'Perdido', '#ef5b5b'],
  ['cancelado', 'Cancelado', '#6f716c'],
]
const isPedido = (s) => ['aprovado', 'lancado_totvs', 'faturado'].includes(s)

function Bars({ items, format }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  if (items.length === 0) return <div className="muted" style={{ fontSize: 13 }}>Sem dados ainda.</div>
  return (
    <div className="chart">
      {items.map((it, i) => (
        <div className="bar-row" key={i}>
          <span className="lbl">{it.label}</span>
          <span className="bar-track"><span className="bar-fill" style={{ width: (it.value / max * 100) + '%', background: it.color || 'var(--accent)' }} /></span>
          <span className="bar-val">{format ? format(it.value) : it.value}</span>
        </div>
      ))}
    </div>
  )
}

function Donut({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const R = 54, C = 2 * Math.PI * R
  let off = 0
  return (
    <div className="donut-wrap">
      <svg width="134" height="134" viewBox="0 0 134 134" role="img" aria-label="Distribuição por status">
        <g transform="rotate(-90 67 67)">
          <circle cx="67" cy="67" r={R} fill="none" stroke="var(--sunk)" strokeWidth="16" />
          {total > 0 && data.filter((d) => d.value > 0).map((d, i) => {
            const len = (d.value / total) * C
            const seg = <circle key={i} cx="67" cy="67" r={R} fill="none" stroke={d.color} strokeWidth="16"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} />
            off += len
            return seg
          })}
        </g>
        <text x="67" y="63" textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--text)" fontFamily="var(--font-head)">{total}</text>
        <text x="67" y="82" textAnchor="middle" fontSize="10" fill="var(--muted)">orçamentos</text>
      </svg>
      <div className="donut-legend">
        {data.filter((d) => d.value > 0).map((d, i) => (
          <div className="li" key={i}><span className="sw" style={{ background: d.color }} />{d.label} · <b style={{ color: 'var(--text)' }}>{d.value}</b></div>
        ))}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [orcs, setOrcs] = useState(null)
  const [clientes, setClientes] = useState([])
  const [nReps, setNReps] = useState(0)

  useEffect(() => {
    async function load() {
      const [{ data: o }, { data: c }, { count }] = await Promise.all([
        supabase.from('orcamentos').select('status,valor_total,rep:profiles!representante_id(nome)'),
        supabase.from('clientes').select('estado,bloqueado'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('papel', 'representante'),
      ])
      setOrcs(o || []); setClientes(c || []); setNReps(count || 0)
    }
    load()
  }, [])

  if (orcs === null) return <div className="spinner" />

  const sum = (f) => orcs.filter(f).reduce((s, o) => s + Number(o.valor_total || 0), 0)
  const count = (f) => orcs.filter(f).length
  const faturado = sum((o) => o.status === 'faturado')
  const nFaturado = count((o) => o.status === 'faturado')
  const pedidos = sum((o) => isPedido(o.status))
  const nGanhos = count((o) => isPedido(o.status))
  const ticket = nFaturado ? faturado / nFaturado : 0
  const conversao = orcs.length ? Math.round((nGanhos / orcs.length) * 100) : 0
  const ativos = count((o) => !['faturado', 'perdido', 'cancelado'].includes(o.status))
  const aguardando = count((o) => o.status === 'em_aprovacao')

  // funil (valor por etapa)
  const funil = STATUS.slice(0, 7).map(([st, label, color]) => ({ label, color, value: sum((o) => o.status === st) }))
  // por representante (pedidos)
  const porRep = {}
  orcs.forEach((o) => { if (isPedido(o.status)) { const n = o.rep?.nome || '—'; porRep[n] = (porRep[n] || 0) + Number(o.valor_total || 0) } })
  const repItems = Object.entries(porRep).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  // status donut
  const donut = STATUS.map(([st, label, color]) => ({ label, color, value: count((o) => o.status === st) }))
  // clientes por estado
  const porEstado = {}
  clientes.forEach((c) => { const e = c.estado || '—'; porEstado[e] = (porEstado[e] || 0) + 1 })
  const estadoItems = Object.entries(porEstado).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)

  return (
    <div>
      <div className="page-head"><h1>Painel da operação</h1></div>

      <div className="metrics">
        <div className="metric accent"><div className="n">{brl(faturado)}</div><div className="k">Faturado</div></div>
        <div className="metric"><div className="n">{brl(pedidos)}</div><div className="k">Pedidos aprovados</div></div>
        <div className="metric"><div className="n">{brl(ticket)}</div><div className="k">Ticket médio</div></div>
        <div className="metric"><div className="n">{conversao}%</div><div className="k">Conversão</div></div>
      </div>
      <div className="metrics">
        <div className="metric"><div className="n">{ativos}</div><div className="k">Orçamentos ativos</div></div>
        <div className="metric"><div className="n">{aguardando}</div><div className="k">Aguardando aprovação</div></div>
        <div className="metric"><div className="n">{clientes.length}</div><div className="k">Clientes</div></div>
        <div className="metric"><div className="n">{nReps}</div><div className="k">Representantes</div></div>
      </div>

      <div className="chart-card">
        <h3>Funil de vendas — valor por etapa</h3>
        <Bars items={funil} format={brl} />
      </div>

      <div className="dash-grid">
        <div className="chart-card" style={{ marginBottom: 0 }}>
          <h3>Faturamento por representante</h3>
          <Bars items={repItems} format={brl} />
        </div>
        <div className="chart-card" style={{ marginBottom: 0 }}>
          <h3>Orçamentos por status</h3>
          <Donut data={donut} />
        </div>
      </div>

      <div className="chart-card" style={{ marginTop: 16 }}>
        <h3>Clientes por estado</h3>
        <Bars items={estadoItems} />
      </div>
    </div>
  )
}
