import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Chart from 'react-apexcharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { brl, dataBR } from '../lib/format'
import { diasAteAniversario } from '../lib/rapport'
import { waLink, TEMPLATES, primeiroNome } from '../lib/whatsapp'
import Icon from '../components/Icon'

const brlShort = (n) => n >= 1000000 ? 'R$ ' + (n / 1000000).toFixed(1).replace('.', ',') + 'M'
  : n >= 1000 ? 'R$ ' + (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',') + 'k' : brl(n)

const ST_COR = { rascunho: '#94a3b8', enviado: '#4f8fe0', aguardando_totvs: '#e3a53a', lancado_totvs: '#12a03a', faturado: '#00c53a', perdido: '#e5544e', cancelado: '#64748b' }
const ST_LBL = { rascunho: 'Rascunho', enviado: 'Enviado', aguardando_totvs: 'Aguard. TOTVS', lancado_totvs: 'Lançado', faturado: 'Faturado', perdido: 'Perdido', cancelado: 'Cancelado' }

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

export default function Dashboard() {
  const { profile, session } = useAuth()
  const nav = useNavigate()
  const mode = useThemeMode()
  const [painel, setPainel] = useState(null)
  const [graf, setGraf] = useState(null)
  const [acoes, setAcoes] = useState([])
  const [rel, setRel] = useState({ niver: [], reativar: [] })
  const [metas, setMetas] = useState([])
  const [rota, setRota] = useState(null)

  useEffect(() => {
    async function load() {
      const d0 = new Date() // data local (não UTC): o dia vira à meia-noite de Brasília
      const hoje = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}`
      const { data: proxData } = await supabase.from('interacoes')
        .select('id, proxima_acao, proxima_acao_data, cliente:clientes(id,razao_social)')
        .eq('representante_id', session.user.id)
        .not('proxima_acao', 'is', null)
        .gte('proxima_acao_data', hoje)
        .order('proxima_acao_data', { ascending: true })
        .limit(6)
      setAcoes(proxData || [])
      const { data: rd } = await supabase.from('rota_dia').select('id,checkin_em')
        .eq('representante_id', session.user.id).eq('dia', hoje)
      setRota({ total: (rd || []).length, feitas: (rd || []).filter((r) => r.checkin_em).length })

      const { data: meus } = await supabase.from('clientes')
        .select('id, razao_social, nome_fantasia, contato_nome, telefone, dados_pessoais, data_ultima_compra')
        .eq('representante_responsavel_id', session.user.id)
      const niver = (meus || []).map((c) => ({ ...c, dias: diasAteAniversario(c.dados_pessoais?.aniversario) }))
        .filter((c) => c.dias != null && c.dias <= 14).sort((a, b) => a.dias - b.dias)
      const reativar = (meus || []).filter((c) => {
        if (!c.data_ultima_compra) return false
        const d = (Date.now() - new Date(c.data_ultima_compra).getTime()) / 86400000
        return d >= 60 && d <= 120
      }).slice(0, 6)
      setRel({ niver, reativar })

      const per = new Date().toISOString().slice(0, 7)
      const [{ data: mts }, { data: mOrcs }, { data: mInt }] = await Promise.all([
        supabase.from('metas').select('*').eq('periodo', per).eq('escopo', 'representante').eq('alvo', session.user.id),
        supabase.from('orcamentos').select('id,numero,status,valor_total,created_at,enviado_em,cliente:clientes(id,razao_social,nome_fantasia,contato_nome,telefone)').eq('representante_id', session.user.id),
        supabase.from('interacoes').select('tipo,resumo,data').eq('representante_id', session.user.id),
      ])
      const inMes = (dt) => (dt || '').slice(0, 7) === per
      const real = (m) => {
        if (m.metrica === 'faturamento') return (mOrcs || []).filter((o) => o.status === 'faturado' && inMes(o.created_at)).reduce((s, o) => s + Number(o.valor_total || 0), 0)
        if (m.metrica === 'pedidos') return (mOrcs || []).filter((o) => ['lancado_totvs', 'faturado'].includes(o.status) && inMes(o.created_at)).length
        if (m.metrica === 'visitas') return (mInt || []).filter((i) => i.tipo !== 'ocorrencia' && inMes(i.data)).length
        if (m.metrica === 'novos_clientes') return (mInt || []).filter((i) => i.resumo === 'Tornou-se Cliente' && inMes(i.data)).length
        return 0
      }
      setMetas((mts || []).map((m) => ({ ...m, real: real(m) })))

      // painel acionável
      const segunda = new Date()
      segunda.setDate(segunda.getDate() - ((segunda.getDay() + 6) % 7))
      segunda.setHours(0, 0, 0, 0)
      const semana = (mInt || []).filter((i) => i.tipo !== 'ocorrencia' && new Date(i.data) >= segunda).length
      const esfriando = (mOrcs || [])
        .filter((o) => o.status === 'enviado' && (Date.now() - new Date(o.enviado_em || o.created_at).getTime()) / 86400000 >= 5)
        .map((o) => ({ ...o, dias: Math.floor((Date.now() - new Date(o.enviado_em || o.created_at).getTime()) / 86400000) }))
        .sort((a, b) => b.dias - a.dias)
      const pipeline = (mOrcs || [])
        .filter((o) => !['faturado', 'perdido', 'cancelado'].includes(o.status))
        .reduce((s, o) => s + Number(o.valor_total || 0), 0)
      setPainel({ semana, esfriando, pipeline })

      // gráficos: visitas por dia (14d) + orçamentos por etapa
      const dias = [...Array(14)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (13 - i)); return d })
      const igualDia = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
      const porDia = dias.map((d) => (mInt || []).filter((x) => x.tipo !== 'ocorrencia' && igualDia(new Date(x.data), d)).length)
      const lbl = dias.map((d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`)
      const funil = {}
      for (const o of mOrcs || []) funil[o.status] = (funil[o.status] || 0) + 1
      setGraf({ porDia, lbl, funil, totalOrcs: (mOrcs || []).length })
    }
    load()
  }, [session])

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const dataLonga = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const fore = mode === 'dark' ? '#9ea09a' : '#5f625b'
  const gridCor = mode === 'dark' ? '#2c2c2a' : '#e8eae2'

  const stEntradas = graf ? Object.entries(graf.funil).filter(([, n]) => n > 0) : []

  return (
    <div>
      <div className="hero">
        <div>
          <div className="hero-hi">{saudacao}, {profile?.nome?.split(' ')[0]}</div>
          <div className="hero-sub">{dataLonga}</div>
        </div>
        {painel && (
          <div className="hero-chips">
            <span className="hchip"><b>{painel.semana}</b> visita{painel.semana === 1 ? '' : 's'} na semana</span>
            <span className="hchip"><b>{brlShort(painel.pipeline)}</b> em aberto</span>
          </div>
        )}
      </div>

      <div className="kpi2-grid">
        <button className="kpi2" style={{ '--kc': '#4f8fe0' }} onClick={() => nav('/rota')}>
          <span className="kpi2-ic"><Icon name="atividade" size={18} /></span>
          <div><div className="kpi2-n">{painel?.semana ?? '—'}</div><div className="kpi2-k">Visitas na semana</div></div>
        </button>
        <button className="kpi2" style={{ '--kc': '#e3a53a' }} onClick={() => document.getElementById('esfriando')?.scrollIntoView({ behavior: 'smooth' })}>
          <span className="kpi2-ic"><Icon name="sino" size={18} /></span>
          <div><div className="kpi2-n">{painel?.esfriando?.length ?? '—'}</div><div className="kpi2-k">Orç. esfriando</div></div>
        </button>
        <button className="kpi2" style={{ '--kc': '#00c53a' }} onClick={() => nav('/funil')}>
          <span className="kpi2-ic"><Icon name="funil" size={18} /></span>
          <div><div className="kpi2-n">{painel ? brlShort(painel.pipeline) : '—'}</div><div className="kpi2-k">Pipeline aberto</div></div>
        </button>
        <button className="kpi2" style={{ '--kc': '#a06ae8' }} onClick={() => document.getElementById('proximas')?.scrollIntoView({ behavior: 'smooth' })}>
          <span className="kpi2-ic"><Icon name="rota" size={18} /></span>
          <div><div className="kpi2-n">{acoes.length}</div><div className="kpi2-k">Próximas ações</div></div>
        </button>
      </div>

      {rota && (
        <Link to="/rota" className="banner accent" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <span>➜</span>
          <span><b>Rota do dia:</b> {rota.total === 0
            ? 'monte sua rota de visitas de hoje — toque para começar'
            : `${rota.feitas} de ${rota.total} parada(s) visitada(s) — toque para abrir`}</span>
        </Link>
      )}

      {painel?.esfriando?.length > 0 && (
        <div id="esfriando">
          <h3 className="sec-h" style={{ '--sc': '#e3a53a' }}>Orçamentos esfriando — cobre antes que esfriem de vez</h3>
          {painel.esfriando.map((o) => (
            <div className="row static" key={o.id}>
              <div className="grow" onClick={() => nav(`/orcamentos/${o.id}`)} style={{ cursor: 'pointer' }}>
                <div className="l1">#{o.numero} · {o.cliente?.razao_social || '—'}</div>
                <div className="l2">{brl(o.valor_total)} · enviado há {o.dias} dia(s) sem resposta</div>
              </div>
              <button className="btn ghost sm" onClick={() => window.open(waLink(o.cliente?.telefone, TEMPLATES.find((t) => t.id === 'orcamento').texto({ primeiro: primeiroNome(o.cliente || {}), rep: (profile?.nome || '').split(' ')[0] })), '_blank')}>Cobrar</button>
            </div>
          ))}
        </div>
      )}

      {graf && (
        <div className="duo">
          <div className="panel-c">
            <h3>Minhas visitas · 14 dias</h3>
            <Chart key={'a' + mode} type="area" height={175}
              series={[{ name: 'Visitas', data: graf.porDia }]}
              options={{
                chart: { toolbar: { show: false }, sparkline: { enabled: false }, foreColor: fore, fontFamily: 'Inter, sans-serif', parentHeightOffset: 0 },
                stroke: { curve: 'smooth', width: 3, colors: ['#00c53a'] },
                fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.42, opacityTo: 0.02, colorStops: [] } },
                colors: ['#00c53a'],
                dataLabels: { enabled: false },
                xaxis: { categories: graf.lbl, tickAmount: 6, labels: { style: { fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
                yaxis: { labels: { formatter: (v) => Math.round(v), style: { fontSize: '10px' } }, tickAmount: 3 },
                grid: { borderColor: gridCor, strokeDashArray: 4, padding: { left: 4, right: 4 } },
                tooltip: { theme: mode, y: { formatter: (v) => v + ' visita(s)' } },
              }} />
          </div>
          <div className="panel-c">
            <h3>Orçamentos por etapa</h3>
            {stEntradas.length === 0 ? <div className="empty" style={{ margin: 0 }}>Sem orçamentos ainda.</div> : (
              <Chart key={'d' + mode} type="donut" height={185}
                series={stEntradas.map(([, n]) => n)}
                options={{
                  labels: stEntradas.map(([s]) => ST_LBL[s] || s),
                  colors: stEntradas.map(([s]) => ST_COR[s] || '#94a3b8'),
                  chart: { foreColor: fore, fontFamily: 'Inter, sans-serif' },
                  legend: { position: 'right', fontSize: '11px', markers: { size: 5 }, itemMargin: { vertical: 2 } },
                  dataLabels: { enabled: false },
                  stroke: { width: 0 },
                  plotOptions: { pie: { donut: { size: '74%', labels: { show: true, total: { show: true, label: 'total', fontSize: '11px', formatter: () => graf.totalOrcs } } } } },
                  tooltip: { theme: mode },
                }} />
            )}
          </div>
        </div>
      )}

      {metas.length > 0 && (
        <>
          <h3 className="sec-h" style={{ '--sc': '#00c53a' }}>Minhas metas do mês</h3>
          <div className="gauges">
            {metas.map((m) => {
              const pct = m.valor ? Math.round(m.real / m.valor * 100) : 0
              const lbl = { faturamento: 'Faturamento', pedidos: 'Pedidos', visitas: 'Visitas', novos_clientes: 'Novos clientes' }[m.metrica]
              const ff = (v) => (m.metrica === 'faturamento' ? brlShort(v) : Math.round(v))
              const cor = pct >= 100 ? '#00c53a' : pct >= 60 ? '#7ad03a' : '#e3a53a'
              return (
                <div className="gauge" key={m.id}>
                  <Chart key={'g' + m.id + mode} type="radialBar" height={150} series={[Math.min(pct, 100)]}
                    options={{
                      chart: { sparkline: { enabled: true } },
                      colors: [cor],
                      plotOptions: { radialBar: {
                        hollow: { size: '58%' }, track: { background: mode === 'dark' ? '#2c2c2a' : '#e8eae2' },
                        dataLabels: { name: { show: false }, value: { offsetY: 5, fontSize: '17px', fontWeight: 800, color: mode === 'dark' ? '#ededea' : '#1f1f1f', formatter: (v) => Math.round(v) + '%' } },
                      } },
                      stroke: { lineCap: 'round' },
                    }} />
                  <div className="gauge-lbl">{lbl}</div>
                  <div className="gauge-sub">{ff(m.real)} de {ff(m.valor)}</div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {rel.niver.length > 0 && (
        <>
          <h3 className="sec-h" style={{ '--sc': '#e86ac4' }}>Aniversários próximos</h3>
          {rel.niver.map((c) => (
            <div className="row static" key={c.id}>
              <div className="grow" onClick={() => nav(`/clientes/${c.id}`)} style={{ cursor: 'pointer' }}>
                <div className="l1">{c.razao_social}</div>
                <div className="l2">{c.dados_pessoais?.aniversario} · {c.dias === 0 ? 'é hoje!' : `em ${c.dias} dia(s)`}</div>
              </div>
              <button className="btn ghost sm" onClick={() => window.open(waLink(c.telefone, TEMPLATES.find((t) => t.id === 'aniversario').texto({ primeiro: primeiroNome(c), rep: (profile?.nome || '').split(' ')[0] })), '_blank')}>Parabenizar</button>
            </div>
          ))}
        </>
      )}
      {rel.reativar.length > 0 && (
        <>
          <h3 className="sec-h" style={{ '--sc': '#4f8fe0' }}>Reative o contato</h3>
          {rel.reativar.map((c) => (
            <div className="row static" key={c.id}>
              <div className="grow" onClick={() => nav(`/clientes/${c.id}`)} style={{ cursor: 'pointer' }}>
                <div className="l1">{c.razao_social}</div>
                <div className="l2">Sem compra há mais de 60 dias</div>
              </div>
              <button className="btn ghost sm" onClick={() => window.open(waLink(c.telefone, TEMPLATES.find((t) => t.id === 'reativar').texto({ primeiro: primeiroNome(c), rep: (profile?.nome || '').split(' ')[0] })), '_blank')}>Chamar</button>
            </div>
          ))}
        </>
      )}

      <h3 className="sec-h" id="proximas" style={{ '--sc': '#a06ae8' }}>Próximas ações</h3>
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
