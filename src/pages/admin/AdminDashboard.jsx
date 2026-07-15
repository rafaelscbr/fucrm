import { useEffect, useMemo, useState } from 'react'
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
const STATUS_COR = { rascunho: '#94a3b8', enviado: '#4f8fe0', confirmado: '#7c6ff0', em_aprovacao: '#e3a53a', aprovado: '#3cc563', lancado_totvs: '#12a03a', faturado: '#00a838', perdido: '#e5544e', cancelado: '#64748b' }
const FUNIL_RAMP = ['#86e3a1', '#5ed685', '#3cc563', '#28b54f', '#17a441', '#0f9238', '#0b7d2c']
const PERIODOS = [['30', '30 dias'], ['90', '90 dias'], ['180', '180 dias'], ['365', '12 meses'], ['all', 'Tudo']]
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const isPedido = (s) => ['aprovado', 'lancado_totvs', 'faturado'].includes(s)
const brlShort = (n) => (n >= 1000 ? 'R$ ' + (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',') + 'k' : brl(n))
const themeMode = () => document.documentElement.getAttribute('data-theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

function useThemeMode() {
  const [mode, setMode] = useState(themeMode())
  useEffect(() => {
    const upd = () => setMode(themeMode())
    const obs = new MutationObserver(upd)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener && mq.addEventListener('change', upd)
    return () => { obs.disconnect(); mq.removeEventListener && mq.removeEventListener('change', upd) }
  }, [])
  return mode
}

export default function AdminDashboard() {
  const { online } = usePresence()
  const mode = useThemeMode()
  const [periodo, setPeriodo] = useState('90')
  const [d, setD] = useState(null)

  useEffect(() => {
    async function load() {
      const [orcs, visitas, clientes, reps, terr, links] = await Promise.all([
        supabase.from('orcamentos').select('status,valor_total,created_at,rep:profiles!representante_id(id,nome)'),
        supabase.from('interacoes').select('representante_id,data'),
        supabase.from('clientes').select('cidade,estado,representante_responsavel_id'),
        supabase.from('profiles').select('id,nome,papel'),
        supabase.from('territorios').select('id,definicao'),
        supabase.from('representante_territorios').select('*'),
      ])
      setD({ orcs: orcs.data || [], visitas: visitas.data || [], clientes: clientes.data || [], reps: reps.data || [], terr: terr.data || [], links: links.data || [] })
    }
    load()
  }, [])

  const calc = useMemo(() => {
    if (!d) return null
    const { orcs, visitas, clientes, reps, terr, links } = d
    const cut = periodo === 'all' ? 0 : Date.now() - Number(periodo) * 86400000
    const oP = orcs.filter((o) => new Date(o.created_at).getTime() >= cut)
    const vP = visitas.filter((v) => new Date(v.data).getTime() >= cut)

    const sum = (arr, f) => arr.filter(f).reduce((s, o) => s + Number(o.valor_total || 0), 0)
    const cnt = (arr, f) => arr.filter(f).length
    const faturado = sum(oP, (o) => o.status === 'faturado')
    const nFat = cnt(oP, (o) => o.status === 'faturado')
    const pedidos = sum(oP, (o) => isPedido(o.status))
    const nGanhos = cnt(oP, (o) => isPedido(o.status))

    // tendência: últimos 6 meses (independe do filtro)
    const meses = [...Array(6)].map((_, i) => { const dt = new Date(); dt.setDate(1); dt.setMonth(dt.getMonth() - 5 + i); return dt.toISOString().slice(0, 7) })
    const serie = (f) => meses.map((m) => Math.round(orcs.filter((o) => (o.created_at || '').slice(0, 7) === m).filter(f).reduce((s, o) => s + Number(o.valor_total || 0), 0)))

    // performance por representante (no período)
    const perf = reps.filter((r) => r.papel === 'representante').map((r) => {
      const meus = oP.filter((o) => o.rep?.id === r.id)
      const nOrc = meus.length
      const nPed = meus.filter((o) => isPedido(o.status)).length
      return {
        nome: r.nome,
        visitas: vP.filter((v) => v.representante_id === r.id).length,
        orcamentos: nOrc,
        pedidos: nPed,
        faturado: sum(meus, (o) => o.status === 'faturado'),
        pipeline: sum(meus, (o) => !['faturado', 'perdido', 'cancelado'].includes(o.status)),
        conv: nOrc ? Math.round((nPed / nOrc) * 100) : null,
      }
    }).sort((a, b) => b.faturado - a.faturado || b.pedidos - a.pedidos)

    const porCidade = {}
    clientes.forEach((c) => { const cc = coordCidade(c.cidade); if (cc) { porCidade[c.cidade] = porCidade[c.cidade] || { coordinates: cc, count: 0 }; porCidade[c.cidade].count++ } })

    const repMarkers = reps.filter((r) => r.papel === 'representante').map((r) => {
      const tIds = links.filter((l) => l.representante_id === r.id).map((l) => l.territorio_id)
      let coord = null
      for (const t of terr.filter((x) => tIds.includes(x.id))) {
        for (const c of (t.definicao?.cidades || [])) { const cc = coordCidade(c); if (cc) { coord = cc; break } }
        if (coord) break
      }
      if (!coord) { const cli = clientes.find((c) => c.representante_responsavel_id === r.id && coordCidade(c.cidade)); if (cli) coord = coordCidade(cli.cidade) }
      return coord ? { coordinates: coord, label: r.nome.split(' ')[0], color: '#4f8fe0', r: 9 } : null
    }).filter(Boolean)

    return {
      faturado, nFat, pedidos, nGanhos,
      ticket: nFat ? faturado / nFat : 0,
      conversao: oP.length ? Math.round((nGanhos / oP.length) * 100) : 0,
      ativos: cnt(oP, (o) => !['faturado', 'perdido', 'cancelado'].includes(o.status)),
      aguardando: cnt(oP, (o) => o.status === 'em_aprovacao'),
      nVisitas: vP.length, nClientes: clientes.length, totalOrcs: oP.length,
      mesesLbl: meses.map((m) => MESES[Number(m.slice(5)) - 1] + '/' + m.slice(2, 4)),
      serieFat: serie((o) => o.status === 'faturado'),
      seriePed: serie((o) => isPedido(o.status)),
      funil: STATUS.slice(0, 7).map(([st, label]) => ({ label, value: Math.round(sum(oP, (o) => o.status === st)) })),
      donut: STATUS.map(([st, label]) => ({ label, color: STATUS_COR[st], value: cnt(oP, (o) => o.status === st) })).filter((x) => x.value > 0),
      repFat: perf.filter((p) => p.faturado > 0 || p.pipeline > 0).map((p) => ({ label: p.nome.split(' ')[0], fat: Math.round(p.faturado), pipe: Math.round(p.pipeline) })),
      perf,
      clienteMarkers: Object.entries(porCidade).map(([label, v]) => ({ coordinates: v.coordinates, r: Math.min(9 + v.count * 2, 19), color: '#00a838', num: v.count })),
      cityRank: Object.entries(porCidade).map(([cidade, v]) => ({ cidade, count: v.count })).sort((a, b) => b.count - a.count),
      repMarkers,
    }
  }, [d, periodo])

  if (!calc) return <div className="spinner" />
  const c = calc

  const fore = mode === 'dark' ? '#9ea09a' : '#5f625b'
  const grid = mode === 'dark' ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)'
  const lbl = { style: { fontSize: '13px', fontWeight: 500, colors: fore } }
  const base = {
    chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif', background: 'transparent', foreColor: fore },
    theme: { mode },
    grid: { borderColor: grid, strokeDashArray: 4 },
    tooltip: { theme: mode, style: { fontSize: '13px' }, y: { formatter: (v) => brl(v) } },
    dataLabels: { enabled: false },
  }
  const key = mode + periodo

  const kpis = [
    { lab: 'Faturado', val: brlShort(c.faturado), sub: `${c.nFat} pedido(s) faturado(s)`, kc: '#00a838' },
    { lab: 'Pedidos aprovados', val: brlShort(c.pedidos), sub: `${c.nGanhos} pedido(s) no período`, kc: '#3cc563' },
    { lab: 'Ticket médio', val: brlShort(c.ticket), sub: 'por pedido faturado', kc: '#4f8fe0' },
    { lab: 'Conversão', val: c.conversao + '%', sub: `${c.nGanhos} de ${c.totalOrcs} orçamentos`, kc: '#7c6ff0' },
    { lab: 'Visitas registradas', val: c.nVisitas, sub: 'no período selecionado', kc: '#4f8fe0' },
    { lab: 'Orçamentos ativos', val: c.ativos, sub: 'em negociação', kc: '#94a3b8' },
    { lab: 'Aguardando aprovação', val: c.aguardando, sub: c.aguardando > 0 ? 'requer sua ação' : 'nada pendente', kc: c.aguardando > 0 ? '#e3a53a' : '#94a3b8' },
    { lab: 'Clientes na base', val: c.nClientes, sub: 'carteira total', kc: '#94a3b8' },
  ]

  return (
    <div>
      <div className="page-head">
        <h1>Painel da operação</h1>
        <div className="seg-ctl" role="group" aria-label="Período">
          {PERIODOS.map(([v, l]) => (
            <button key={v} className={periodo === v ? 'on' : ''} onClick={() => setPeriodo(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div className="kpi" key={i} style={{ '--kc': k.kc }}>
            <div className="lab">{k.lab}</div>
            <div className="val">{k.val}</div>
            <div className="sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="cockpit w21">
        <div className="panel">
          <h3>Receita — últimos 6 meses</h3>
          <Chart key={'t' + key} type="area" height={300} series={[
            { name: 'Faturado', data: c.serieFat },
            { name: 'Pedidos aprovados', data: c.seriePed },
          ]} options={{
            ...base, colors: ['#00a838', '#4f8fe0'],
            stroke: { curve: 'smooth', width: 3 },
            fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.34, opacityTo: 0.03, stops: [0, 92] } },
            xaxis: { categories: c.mesesLbl, labels: lbl, axisBorder: { show: false }, axisTicks: { show: false } },
            yaxis: { labels: { ...lbl, formatter: brlShort } },
            legend: { position: 'top', horizontalAlign: 'right', fontSize: '13px' },
            markers: { size: 4, strokeWidth: 2, hover: { size: 6 } },
          }} />
        </div>
        <div className="panel">
          <h3>Orçamentos por status</h3>
          <Chart key={'d' + key} type="donut" height={300} series={c.donut.map((s) => s.value)} options={{
            ...base, labels: c.donut.map((s) => s.label), colors: c.donut.map((s) => s.color),
            tooltip: { theme: mode }, legend: { position: 'bottom', fontSize: '13px' },
            stroke: { width: 2, colors: [mode === 'dark' ? '#1f1f1f' : '#ffffff'] },
            plotOptions: { pie: { donut: { size: '66%', labels: { show: true, value: { fontSize: '28px', fontWeight: 800, color: mode === 'dark' ? '#ededea' : '#1f1f1f' }, total: { show: true, label: 'Total', fontSize: '13px', color: fore, formatter: () => String(c.totalOrcs) } } } } },
          }} />
        </div>
      </div>

      <div className="cockpit">
        <div className="panel">
          <h3>Funil — valor por etapa</h3>
          <Chart key={'f' + key} type="bar" height={300} series={[{ name: 'Valor', data: c.funil.map((f) => f.value) }]} options={{
            ...base, colors: FUNIL_RAMP,
            plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 5, barHeight: '62%' } },
            xaxis: { categories: c.funil.map((f) => f.label), labels: { ...lbl, formatter: brlShort } },
            yaxis: { labels: lbl }, legend: { show: false },
            dataLabels: { enabled: true, formatter: brlShort, style: { fontSize: '12px', fontWeight: 700, colors: ['#fff'] }, dropShadow: { enabled: true, top: 1, left: 0, blur: 2, opacity: 0.45 } },
          }} />
        </div>
        <div className="panel">
          <h3>Representantes — faturado × pipeline</h3>
          <Chart key={'r' + key} type="bar" height={300} series={[
            { name: 'Faturado', data: c.repFat.map((r) => r.fat) },
            { name: 'Em negociação', data: c.repFat.map((r) => r.pipe) },
          ]} options={{
            ...base, colors: ['#00a838', '#4f8fe0'],
            plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '62%' } },
            xaxis: { categories: c.repFat.map((r) => r.label), labels: { ...lbl, formatter: brlShort } },
            yaxis: { labels: lbl },
            legend: { position: 'top', horizontalAlign: 'right', fontSize: '13px' },
          }} />
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h3>Performance por representante <span className="cnt">{PERIODOS.find(([v]) => v === periodo)?.[1]}</span></h3>
        <div className="tbl-wrap" style={{ border: 0 }}>
          <table className="tbl">
            <thead><tr>
              <th>Representante</th><th style={{ textAlign: 'right' }}>Visitas</th><th style={{ textAlign: 'right' }}>Orçamentos</th>
              <th style={{ textAlign: 'right' }}>Pedidos</th><th style={{ textAlign: 'right' }}>Faturado</th>
              <th style={{ textAlign: 'right' }}>Pipeline</th><th style={{ textAlign: 'right' }}>Conversão</th>
            </tr></thead>
            <tbody>
              {c.perf.map((p) => (
                <tr key={p.nome}>
                  <td style={{ fontWeight: 600 }}>{p.nome}</td>
                  <td style={{ textAlign: 'right' }}>{p.visitas}</td>
                  <td style={{ textAlign: 'right' }}>{p.orcamentos}</td>
                  <td style={{ textAlign: 'right' }}>{p.pedidos}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{brl(p.faturado)}</td>
                  <td style={{ textAlign: 'right' }}>{brl(p.pipeline)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {p.conv === null ? <span className="faint">—</span> :
                      <span className={'pill ' + (p.conv >= 50 ? 'g' : p.conv >= 25 ? 'w' : 'r')}>{p.conv}%</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      <div className="map-card" style={{ marginBottom: 16 }}>
        <h3>Onde temos clientes</h3>
        <div className="sub">A bolha mostra o nº de clientes na cidade · a lista ranqueia · arraste/zoom para aproximar</div>
        <div className="map-flex">
          <div className="mapa">
            <MapaBrasil mode="num" markers={c.clienteMarkers} height={540} ariaLabel="Mapa de clientes por cidade na região Sul" />
          </div>
          <div className="city-list" role="list" aria-label="Clientes por cidade">
            {c.cityRank.map((x) => (
              <div className="ci" role="listitem" key={x.cidade}>
                <span>{x.cidade}</span><b>{x.count}</b>
                <span className="bar"><i style={{ width: (x.count / c.cityRank[0].count * 100) + '%' }} /></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="map-card">
        <h3>Territórios dos representantes</h3>
        <div className="sub">Pino na região de atuação de cada representante</div>
        <MapaBrasil mode="label" markers={c.repMarkers} fontSize={16} height={470} ariaLabel="Mapa com a região de cada representante" />
      </div>
    </div>
  )
}
