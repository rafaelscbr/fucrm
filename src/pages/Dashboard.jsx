import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { brl, dataBR } from '../lib/format'
import { diasAteAniversario } from '../lib/rapport'
import { waLink, TEMPLATES, primeiroNome } from '../lib/whatsapp'

export default function Dashboard() {
  const { profile, session } = useAuth()
  const nav = useNavigate()
  const [stats, setStats] = useState(null)
  const [acoes, setAcoes] = useState([])
  const [rel, setRel] = useState({ niver: [], reativar: [] })
  const [metas, setMetas] = useState([])
  const [rota, setRota] = useState(null)

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
        supabase.from('orcamentos').select('status,valor_total,created_at').eq('representante_id', session.user.id),
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

      {rota && (
        <Link to="/rota" className="banner accent" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <span>➜</span>
          <span><b>Rota do dia:</b> {rota.total === 0
            ? 'monte sua rota de visitas de hoje — toque para começar'
            : `${rota.feitas} de ${rota.total} parada(s) visitada(s) — toque para abrir`}</span>
        </Link>
      )}

      {metas.length > 0 && (
        <>
          <h3 style={{ fontSize: 16, margin: '4px 0 12px' }}>Minhas metas do mês</h3>
          {metas.map((m) => {
            const pct = m.valor ? Math.round(m.real / m.valor * 100) : 0
            const lbl = { faturamento: 'Faturamento', pedidos: 'Pedidos', visitas: 'Visitas', novos_clientes: 'Novos clientes' }[m.metrica]
            const ff = (v) => (m.metrica === 'faturamento' ? brl(v) : Math.round(v))
            return (
              <div className="meta-row" key={m.id}>
                <div className="meta-top"><span className="meta-lbl">{lbl}</span><b style={{ color: pct >= 100 ? 'var(--accent-text)' : 'var(--muted)', fontSize: 13 }}>{pct}%</b></div>
                <div className="meter"><i style={{ width: Math.min(pct, 100) + '%' }} /></div>
                <div className="meta-prog"><span>{ff(m.real)} de {ff(m.valor)}</span></div>
              </div>
            )
          })}
        </>
      )}
      {rel.niver.length > 0 && (
        <>
          <h3 style={{ fontSize: 16, margin: '4px 0 12px' }}>Aniversários próximos</h3>
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
          <h3 style={{ fontSize: 16, margin: '18px 0 12px' }}>Reative o contato</h3>
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
      <h3 style={{ fontSize: 16, margin: '18px 0 12px' }}>Próximas ações</h3>
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
