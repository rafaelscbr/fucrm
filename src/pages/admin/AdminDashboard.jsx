import { useEffect, useState } from 'react'
import Chart from 'react-apexcharts'
import { supabase } from '../../lib/supabase'
import { brl } from '../../lib/format'
import { coordCidade } from '../../lib/cidades'
import { usePresence } from '../../context/PresenceContext'
import MapaBrasil from '../../components/MapaBrasil'

const STATUS = [
  ['rascunho', 'Rascunho', '#8a8d84'], ['enviado', 'Enviado', '#5aa2f0'],
  ['confirmado', 'Confirmado', '#7c6ff0'], ['em_aprovacao', 'Em aprovação', '#e3a53a'],
  ['aprovado', 'Aprovado', '#26d451'], ['lancado_totvs', 'Lançado TOTVS', '#12a03a'],
  ['faturado', 'Faturado', '#00c53a'], ['perdido', 'Perdido', '#ef5b5b'], ['cancelado', 'Cancelado', '#6f716c'],
]
const isPedido = (s) => ['aprovado', 'lancado_totvs', 'faturado'].includes(s)
const brlShort = (n) => (n >= 1000 ? 'R$ ' + (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',') + 'k' : brl(n))
const themeMode = () => document.documentElement.getAttribute('data-theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

export default function AdminDashboard() {
  const { online } = usePresence()
  const [d, setD] = useState(null)

  useEffect(() => {
    async function load() {
      const [orcs, clientes, reps, terr, links] = await Promise.all([
        supabase.from('orcamentos').select('status,valor_total,rep:profiles!representante_id(nome)'),
        supabase.from('clientes').select('cidade,estado,representante_responsavel_id'),
        supabase.from('profiles').select('id,nome,papel'),
        supabase.from('territorios').select('id,definicao'),
        supabase.from('representante_territorios').select('*'),
      ])
      setD({ orcs: orcs.data || [], clientes: clientes.data || [], reps: reps.data || [], terr: terr.data || [], links: links.data || [] })
    }
    load()
  }, [])

  if (!d) return <div className="spinner" />
  const { orcs, clientes, reps, terr, links } = d
  const mode = themeMode()

  const sum = (f) => orcs.filter(f).reduce((s, o) => s + Number(o.valor_total || 0), 0)
  const cnt = (f) => orcs.filter(f).length
  const faturado = sum((o) => o.status === 'faturado')
  const nFat = cnt((o) => o.status === 'faturado')
  const pedidos = sum((o) => isPedido(o.status))
  const ticket = nFat ? faturado / nFat : 0
  const conversao = orcs.length ? Math.round((cnt((o) => isPedido(o.status)) / orcs.length) * 100) : 0
  const ativos = cnt((o) => !['faturado', 'perdido', 'cancelado'].includes(o.status))
  const aguardando = cnt((o) => o.status === 'em_aprovacao')

  const kpis = [
    { ic: '💰', tint: '#00c53a', val: brlShort(faturado), lab: 'Faturado' },
    { ic: '📦', tint: '#5aa2f0', val: brlShort(pedidos), lab: 'Pedidos aprovados' },
    { ic: '🎯', tint: '#7c6ff0', val: brlShort(ticket), lab: 'Ticket médio' },
    { ic: '📈', tint: '#e3a53a', val: conversao + '%', lab: 'Conversão' },
    { ic: '🧾', tint: '#26d451', val: ativos, lab: 'Orçamentos ativos' },
    { ic: '⏳', tint: '#e3a53a', val: aguardando, lab: 'Aguardando aprovação' },
    { ic: '🏢', tint: '#5aa2f0', val: clientes.length, lab: 'Clientes' },
    { ic: '🟢', tint: '#00c53a', val: online.length, lab: 'Online agora' },
  ]

  // faturamento por rep
  const porRep = {}
  orcs.forEach((o) => { if (isPedido(o.status)) { const n = o.rep?.nome || '—'; porRep[n] = (porRep[n] || 0) + Number(o.valor_total || 0) } })
  const repItems = Object.entries(porRep).map(([label, value]) => ({ label, value: Math.round(value) })).sort((a, b) => b.value - a.value)

  // funil valor por etapa
  const funil = STATUS.slice(0, 7).map(([st, label, color]) => ({ label, color, value: Math.round(sum((o) => o.status === st)) }))
  // status donut (>0)
  const donut = STATUS.map(([st, label, color]) => ({ label, color, value: cnt((o) => o.status === st) })).filter((x) => x.value > 0)

  // mapa: clientes por cidade
  const porCidade = {}
  clientes.forEach((c) => { const cc = coordCidade(c.cidade); if (cc) { const k = c.cidade; porCidade[k] = porCidade[k] || { coordinates: cc, count: 0 }; porCidade[k].count++ } })
  const clienteMarkers = Object.entries(porCidade).map(([label, v]) => ({ coordinates: v.coordinates, r: Math.min(4 + v.count * 2.2, 15), color: '#00c53a', label: `${label} (${v.count})` }))

  // mapa: pin de cada representante
  const repMarkers = reps.filter((r) => r.papel === 'representante').map((r) => {
    const terrIds = links.filter((l) => l.representante_id === r.id).map((l) => l.territorio_id)
    let coord = null
    for (const t of terr.filter((x) => terrIds.includes(x.id))) {
      for (const c of (t.definicao?.cidades || [])) { const cc = coordCidade(c); if (cc) { coord = cc; break } }
      if (coord) break
    }
    if (!coord) { const cli = clientes.find((c) => c.representante_responsavel_id === r.id && coordCidade(c.cidade)); if (cli) coord = coordCidade(cli.cidade) }
    return coord ? { coordinates: coord, label: r.nome.split(' ')[0], color: '#5aa2f0', r: 6 } : null
  }).filter(Boolean)

  const base = {
    chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif', background: 'transparent' },
    theme: { mode },
    grid: { borderColor: mode === 'dark' ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' },
    tooltip: { theme: mode }, dataLabels: { enabled: false },
    states: { hover: { filter: { type: 'lighten', value: 0.06 } } },
  }

  return (
    <div>
      <div className="page-head"><h1>Cockpit da operação</h1></div>

      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div className="kpi" key={i}>
            <div className="ic" style={{ background: k.tint + '22', color: k.tint }}>{k.ic}</div>
            <div className="val">{k.val}</div>
            <div className="lab">{k.lab}</div>
          </div>
        ))}
      </div>

      <div className="cockpit">
        <div className="panel">
          <h3>Representantes online <span className="cnt">{online.length}</span></h3>
          {online.length === 0 ? <div className="muted" style={{ fontSize: 13 }}>Ninguém online.</div> : online.map((u, i) => (
            <div className="online-item" key={i}>
              <span className="online-dot" />
              <div><div className="nm">{u.nome}</div><div className="role">{u.papel}</div></div>
              <span className="tl">{u.tela}</span>
            </div>
          ))}
        </div>
        <div className="panel">
          <h3>Taxa de conversão</h3>
          <Chart type="radialBar" height={230} series={[conversao]} options={{
            ...base, colors: ['#00c53a'], labels: ['Conversão'], stroke: { lineCap: 'round' },
            plotOptions: { radialBar: { hollow: { size: '58%' }, track: { background: mode === 'dark' ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)' }, dataLabels: { name: { offsetY: 20, fontSize: '12px' }, value: { offsetY: -10, fontSize: '30px', fontWeight: 800, formatter: (v) => Math.round(v) + '%' } } } },
            fill: { type: 'gradient', gradient: { shade: 'dark', gradientToColors: ['#26d451'], stops: [0, 100] } },
          }} />
        </div>
      </div>

      <div className="cockpit">
        <div className="panel">
          <h3>Faturamento por representante</h3>
          <Chart type="bar" height={260} series={[{ name: 'Faturamento', data: repItems.map((r) => r.value) }]} options={{
            ...base, colors: ['#00c53a', '#5aa2f0', '#7c6ff0', '#e3a53a', '#ef5b5b'],
            plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 6, barHeight: '58%' } },
            xaxis: { categories: repItems.map((r) => r.label), labels: { formatter: brlShort } },
            legend: { show: false }, dataLabels: { enabled: true, formatter: brlShort, style: { fontSize: '11px', colors: ['#fff'] } },
          }} />
        </div>
        <div className="panel">
          <h3>Orçamentos por status</h3>
          <Chart type="donut" height={260} series={donut.map((s) => s.value)} options={{
            ...base, labels: donut.map((s) => s.label), colors: donut.map((s) => s.color),
            legend: { position: 'bottom', fontSize: '12px' }, stroke: { width: 2, colors: [mode === 'dark' ? '#1f1f1f' : '#fff'] },
            plotOptions: { pie: { donut: { size: '62%', labels: { show: true, total: { show: true, label: 'Total', formatter: () => String(orcs.length) } } } } },
          }} />
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h3>Funil de vendas — valor por etapa</h3>
        <Chart type="bar" height={280} series={[{ name: 'Valor', data: funil.map((f) => f.value) }]} options={{
          ...base, colors: funil.map((f) => f.color),
          plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 6, barHeight: '62%' } },
          xaxis: { categories: funil.map((f) => f.label), labels: { formatter: brlShort } },
          legend: { show: false }, dataLabels: { enabled: true, formatter: brlShort, style: { fontSize: '10px', colors: ['#fff'] } },
        }} />
      </div>

      <div className="cockpit">
        <div className="map-card">
          <h3>Onde temos clientes</h3>
          <div className="sub">Região Sul · tamanho do ponto = nº de clientes</div>
          <MapaBrasil markers={clienteMarkers} showLabels center={[-51, -27.6]} scale={2100} height={360} />
        </div>
        <div className="map-card">
          <h3>Territórios dos representantes</h3>
          <div className="sub">Pino na região de cada representante</div>
          <MapaBrasil markers={repMarkers} showLabels center={[-51, -27.6]} scale={2100} height={360} />
        </div>
      </div>
    </div>
  )
}
