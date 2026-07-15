import { useEffect, useState } from 'react'
import Chart from 'react-apexcharts'
import { supabase } from '../../lib/supabase'
import { brl } from '../../lib/format'
import { coordCidade } from '../../lib/cidades'
import { usePresence } from '../../context/PresenceContext'
import MapaBrasil from '../../components/MapaBrasil'

const STATUS = [
  ['rascunho', 'Rascunho'], ['enviado', 'Enviado'], ['confirmado', 'Confirmado'],
  ['em_aprovacao', 'Em aprovação'], ['aprovado', 'Aprovado'], ['lancado_totvs', 'Lançado TOTVS'],
  ['faturado', 'Faturado'], ['perdido', 'Perdido'], ['cancelado', 'Cancelado'],
]
const STATUS_COR = { rascunho: '#94a3b8', enviado: '#5aa2f0', confirmado: '#7c6ff0', em_aprovacao: '#e3a53a', aprovado: '#3cc563', lancado_totvs: '#12a03a', faturado: '#00a838', perdido: '#e5544e', cancelado: '#64748b' }
const FUNIL_RAMP = ['#cdefd6', '#9fe3b0', '#6ed488', '#3cc563', '#1fb54c', '#12a03a', '#0b7d2c']
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
  const nGanhos = cnt((o) => isPedido(o.status))
  const ticket = nFat ? faturado / nFat : 0
  const conversao = orcs.length ? Math.round((nGanhos / orcs.length) * 100) : 0
  const ativos = cnt((o) => !['faturado', 'perdido', 'cancelado'].includes(o.status))
  const aguardando = cnt((o) => o.status === 'em_aprovacao')

  const kpis = [
    { lab: 'Faturado', val: brlShort(faturado), sub: `${nFat} nota(s) faturada(s)`, kc: '#00a838' },
    { lab: 'Pedidos aprovados', val: brlShort(pedidos), sub: `${nGanhos} pedido(s)`, kc: '#00a838' },
    { lab: 'Ticket médio', val: brlShort(ticket), sub: 'por pedido faturado', kc: '#8b94a3' },
    { lab: 'Conversão', val: conversao + '%', sub: 'ganhos sobre o total', kc: '#00a838' },
    { lab: 'Orçamentos ativos', val: ativos, sub: 'em andamento', kc: '#8b94a3' },
    { lab: 'Aguardando aprovação', val: aguardando, sub: aguardando > 0 ? 'requer sua ação' : 'nada pendente', kc: aguardando > 0 ? '#e3a53a' : '#8b94a3' },
    { lab: 'Clientes', val: clientes.length, sub: 'na base ativa', kc: '#8b94a3' },
    { lab: 'Online agora', val: online.length, sub: 'usuários conectados', kc: '#00a838' },
  ]

  const porRep = {}
  orcs.forEach((o) => { if (isPedido(o.status)) { const n = o.rep?.nome || '—'; porRep[n] = (porRep[n] || 0) + Number(o.valor_total || 0) } })
  const repItems = Object.entries(porRep).map(([label, value]) => ({ label, value: Math.round(value) })).sort((a, b) => b.value - a.value)
  const funil = STATUS.slice(0, 7).map(([st, label]) => ({ label, value: Math.round(sum((o) => o.status === st)) }))
  const donut = STATUS.map(([st, label]) => ({ label, color: STATUS_COR[st], value: cnt((o) => o.status === st) })).filter((x) => x.value > 0)

  const porCidade = {}
  clientes.forEach((c) => { const cc = coordCidade(c.cidade); if (cc) { const k = c.cidade; porCidade[k] = porCidade[k] || { coordinates: cc, count: 0 }; porCidade[k].count++ } })
  const clienteMarkers = Object.entries(porCidade).map(([label, v]) => ({ coordinates: v.coordinates, r: Math.min(5 + v.count * 2.2, 16), color: '#00a838', label: `${label} (${v.count})` }))

  const repMarkers = reps.filter((r) => r.papel === 'representante').map((r) => {
    const terrIds = links.filter((l) => l.representante_id === r.id).map((l) => l.territorio_id)
    let coord = null
    for (const t of terr.filter((x) => terrIds.includes(x.id))) {
      for (const c of (t.definicao?.cidades || [])) { const cc = coordCidade(c); if (cc) { coord = cc; break } }
      if (coord) break
    }
    if (!coord) { const cli = clientes.find((c) => c.representante_responsavel_id === r.id && coordCidade(c.cidade)); if (cli) coord = coordCidade(cli.cidade) }
    return coord ? { coordinates: coord, label: r.nome.split(' ')[0], color: '#5aa2f0', r: 7 } : null
  }).filter(Boolean)

  const gridColor = mode === 'dark' ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'
  const lblStyle = { fontSize: '13px', fontWeight: 500 }
  const base = {
    chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif', background: 'transparent' },
    theme: { mode },
    grid: { borderColor: gridColor, strokeDashArray: 4 },
    tooltip: { theme: mode, style: { fontSize: '13px' } },
    dataLabels: { enabled: false },
    states: { hover: { filter: { type: 'lighten', value: 0.05 } } },
  }

  return (
    <div>
      <div className="page-head"><h1>Painel da operação</h1></div>

      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div className="kpi" key={i} style={{ '--kc': k.kc }}>
            <div className="lab">{k.lab}</div>
            <div className="val">{k.val}</div>
            <div className="sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="cockpit">
        <div className="panel">
          <h3>Funil de vendas — valor por etapa</h3>
          <Chart type="bar" height={300} series={[{ name: 'Valor', data: funil.map((f) => f.value) }]} options={{
            ...base, colors: FUNIL_RAMP,
            plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 5, barHeight: '64%' } },
            xaxis: { categories: funil.map((f) => f.label), labels: { style: lblStyle, formatter: brlShort } },
            yaxis: { labels: { style: lblStyle } },
            legend: { show: false },
            dataLabels: { enabled: true, formatter: brlShort, style: { fontSize: '12px', fontWeight: 600, colors: ['#0b3d1a'] } },
          }} />
        </div>
        <div className="panel">
          <h3>Taxa de conversão</h3>
          <Chart type="radialBar" height={300} series={[conversao]} options={{
            ...base, colors: ['#00a838'], labels: ['Conversão'], stroke: { lineCap: 'round' },
            plotOptions: { radialBar: { hollow: { size: '60%' }, track: { background: gridColor }, dataLabels: { name: { offsetY: 24, fontSize: '14px' }, value: { offsetY: -12, fontSize: '38px', fontWeight: 800, formatter: (v) => Math.round(v) + '%' } } } },
            fill: { type: 'gradient', gradient: { shade: 'dark', gradientToColors: ['#3cc563'], stops: [0, 100] } },
          }} />
        </div>
      </div>

      <div className="cockpit">
        <div className="panel">
          <h3>Faturamento por representante</h3>
          <Chart type="bar" height={290} series={[{ name: 'Faturamento', data: repItems.map((r) => r.value) }]} options={{
            ...base, colors: ['#00a838'],
            fill: { type: 'gradient', gradient: { shade: 'dark', type: 'horizontal', gradientToColors: ['#26d451'], stops: [0, 100] } },
            plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '55%' } },
            xaxis: { categories: repItems.map((r) => r.label), labels: { style: lblStyle, formatter: brlShort } },
            yaxis: { labels: { style: lblStyle } },
            dataLabels: { enabled: true, formatter: brlShort, style: { fontSize: '12px', fontWeight: 600, colors: ['#fff'] } },
          }} />
        </div>
        <div className="panel">
          <h3>Orçamentos por status</h3>
          <Chart type="donut" height={290} series={donut.map((s) => s.value)} options={{
            ...base, labels: donut.map((s) => s.label), colors: donut.map((s) => s.color),
            legend: { position: 'bottom', fontSize: '13px', markers: { width: 11, height: 11 } },
            stroke: { width: 2, colors: [mode === 'dark' ? '#1f1f1f' : '#fff'] },
            plotOptions: { pie: { donut: { size: '64%', labels: { show: true, value: { fontSize: '26px', fontWeight: 800 }, total: { show: true, label: 'Total', fontSize: '13px', formatter: () => String(orcs.length) } } } } },
          }} />
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h3>Representantes online <span className="cnt">{online.length}</span></h3>
        <div className="online-row">
          {online.length === 0 ? <span className="muted" style={{ fontSize: 13 }}>Ninguém conectado no momento.</span> : online.map((u, i) => (
            <div className="online-chip" key={i}>
              <span className="online-dot" />
              <div><div className="nm">{u.nome}</div><div className="role">{u.papel} · {u.tela}</div></div>
            </div>
          ))}
        </div>
      </div>

      <div className="cockpit">
        <div className="map-card">
          <h3>Onde temos clientes</h3>
          <div className="sub">Região Sul · o ponto cresce com o nº de clientes na cidade</div>
          <MapaBrasil markers={clienteMarkers} showLabels center={[-51, -27.6]} scale={2100} height={380} ariaLabel="Mapa de clientes por cidade na região Sul" />
        </div>
        <div className="map-card">
          <h3>Territórios dos representantes</h3>
          <div className="sub">Pino na região de atuação de cada representante</div>
          <MapaBrasil markers={repMarkers} showLabels center={[-51, -27.6]} scale={2100} height={380} ariaLabel="Mapa com a região de cada representante" />
        </div>
      </div>
    </div>
  )
}
