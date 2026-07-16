import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { brl, tipoClienteLabel, statusLabel, canalLabel, tipoInteracaoLabel, diasAtras, dataBR, dataHoraBR } from '../lib/format'
import EnderecosCliente from '../components/EnderecosCliente'
import { waLink, TEMPLATES, primeiroNome } from '../lib/whatsapp'
import { rotaUrl } from '../lib/rapport'

function healthScore(cli, inter) {
  let s = 0
  s += Math.min(inter.length * 12, 40)
  const last = inter[0]?.data
  if (last) {
    const d = (Date.now() - new Date(last).getTime()) / 86400000
    s += d <= 15 ? 30 : d <= 45 ? 18 : 6
  }
  const dp = cli.dados_pessoais || {}
  s += Math.min(Object.values(dp).filter(Boolean).length * 10, 30)
  return Math.min(s, 100)
}

export default function ClienteFicha() {
  const { id } = useParams()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const { session, profile } = useAuth()
  const [cli, setCli] = useState(null)
  const [inter, setInter] = useState([])
  const [orcs, setOrcs] = useState([])
  const [tab, setTab] = useState('rel')
  const [msgOpen, setMsgOpen] = useState(false)
  const [resumoIA, setResumoIA] = useState(null)
  const [loaded, setLoaded] = useState(false)

  async function prepararVisita(c = cli, ints = inter, os = orcs) {
    setResumoIA('loading')
    try {
      // o que clientes parecidos da região compram (dentro do que a RLS deixa ver)
      let produtosRegiao = []
      try {
        const { data: itensReg } = await supabase.from('orcamento_itens')
          .select('codigo_inteligente,descricao,orcamento:orcamentos!inner(status,cliente_id,cliente:clientes!inner(estado))')
          .in('orcamento.status', ['lancado_totvs', 'faturado'])
          .eq('orcamento.cliente.estado', c.estado || '')
          .limit(400)
        const cont = {}
        for (const it of itensReg || []) {
          if (!it.codigo_inteligente || it.orcamento?.cliente_id === id) continue
          if (!cont[it.codigo_inteligente]) cont[it.codigo_inteligente] = { codigo: it.codigo_inteligente, descricao: it.descricao, vezes: 0 }
          cont[it.codigo_inteligente].vezes++
        }
        const ids = os.map((o) => o.id)
        const { data: meusItens } = ids.length
          ? await supabase.from('orcamento_itens').select('codigo_inteligente').in('orcamento_id', ids)
          : { data: [] }
        const jaTem = new Set((meusItens || []).map((x) => x.codigo_inteligente))
        produtosRegiao = Object.values(cont).filter((p) => !jaTem.has(p.codigo))
          .sort((a, b) => b.vezes - a.vezes).slice(0, 6)
      } catch { /* segue sem cross-sell */ }

      const { data, error } = await supabase.functions.invoke('ai-preparar', {
        body: {
          cliente: {
            razao_social: c.razao_social, cidade: c.cidade, estado: c.estado, estagio: c.estagio,
            tipo_cliente: c.tipo_cliente, contato_nome: c.contato_nome, contato_cargo: c.contato_cargo,
            data_ultima_compra: c.data_ultima_compra,
          },
          pessoais: c.dados_pessoais || {},
          interacoes: ints.slice(0, 15).map((i) => ({ data: i.data, resumo: i.resumo, recepcao: i.recepcao })),
          orcamentos: os.slice(0, 10).map((o) => ({ numero: o.numero, status: o.status, valor: o.valor_total, data: o.created_at })),
          produtosRegiao,
        },
      })
      if (error || data?.error) throw new Error()
      setResumoIA(data)
    } catch { setResumoIA('erro') }
  }

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase.from('clientes').select('*').eq('id', id).single()
      setCli(c)
      const { data: i } = await supabase.from('interacoes').select('*').eq('cliente_id', id).order('data', { ascending: false })
      setInter(i || [])
      const { data: o } = await supabase.from('orcamentos').select('id,numero,status,valor_total,created_at').eq('cliente_id', id).order('created_at', { ascending: false })
      setOrcs(o || [])
      setLoaded(true)
      // veio da Rota do dia com ?preparar=1 → já dispara a preparação
      if (c && sp.get('preparar')) prepararVisita(c, i || [], o || [])
    }
    setLoaded(false); setResumoIA(null)
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!cli) return <div className="spinner" />
  const dp = cli.dados_pessoais || {}
  const PLBL = { aniversario: 'Aniversário', esposa: 'Esposa', marido: 'Marido', filha: 'Filha', filho: 'Filho', filhos: 'Filhos', familia: 'Família', interesses: 'Interesses', perfil: 'Perfil', historias: 'Histórias' }
  const pontos = Object.entries(dp).filter(([, v]) => v && typeof v === 'string')
  const score = healthScore(cli, inter)
  const meu = cli.representante_responsavel_id === session?.user?.id

  return (
    <div>
      <button className="back" onClick={() => nav(-1)}>‹ Clientes</button>
      <div className="page-head">
        <div>
          <h1>{cli.razao_social}</h1>
          <p className="muted" style={{ fontSize: 13 }}>
            {[cli.contato_nome ? `${cli.contato_nome}${cli.contato_cargo ? ` (${cli.contato_cargo})` : ''}` : null, [cli.cidade, cli.estado].filter(Boolean).join(' · '), tipoClienteLabel[cli.tipo_cliente]].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span className="pill n">{({ lead: 'Lead', prospect: 'Prospect', cliente: 'Cliente', descartado: 'Descartado' })[cli.estagio] || cli.estagio}</span>
          {cli.bloqueado ? <span className="pill r">bloqueado</span> : meu ? <span className="pill g">meu</span> : <span className="pill w">outro rep</span>}
        </div>
      </div>

      <div className="toolbar no-print">
        <Link className="btn" to={`/clientes/${id}/visita`}>＋ Registrar visita</Link>
        <Link className="btn ghost" to={`/orcamentos/novo?cliente=${id}`}>Novo orçamento</Link>
        <button className="btn ghost" onClick={() => setMsgOpen(true)}>WhatsApp</button>
        <a className="btn ghost" href={rotaUrl(cli)} target="_blank" rel="noreferrer">Rota</a>
        <button className="btn ghost" onClick={() => prepararVisita()} disabled={!loaded || resumoIA === 'loading'}>{resumoIA === 'loading' ? 'Preparando…' : 'Preparar visita'}</button>
      </div>
      {resumoIA && typeof resumoIA === 'object' && (
        <div className="briefing no-print" style={{ marginBottom: 16 }}>
          <div className="k">Preparação da visita (IA)</div>
          <div className="line">{resumoIA.briefing}</div>
          {(resumoIA.ganchos || []).length > 0 && <div className="line" style={{ marginTop: 8 }}><b>Ganchos de conversa</b></div>}
          {(resumoIA.ganchos || []).map((g, i) => <div className="line" key={'g' + i}>• {g}</div>)}
          {(resumoIA.oferecer || []).length > 0 && <div className="line" style={{ marginTop: 8 }}><b>O que oferecer</b></div>}
          {(resumoIA.oferecer || []).map((o, i) => <div className="line" key={'o' + i}>• {o}</div>)}
          {(resumoIA.abordagem || resumoIA.sugestao) && <div className="line" style={{ marginTop: 8 }}><b>Abordagem:</b> {resumoIA.abordagem || resumoIA.sugestao}</div>}
        </div>
      )}
      {resumoIA === 'erro' && <div className="banner warn no-print"><span>!</span><span>IA ocupada — tente de novo em instantes.</span></div>}

      {msgOpen && (
        <div className="modal-overlay no-print" onClick={(e) => e.target === e.currentTarget && setMsgOpen(false)}>
          <div className="modal">
            <h3 style={{ marginBottom: 12 }}>Mensagem no WhatsApp</h3>
            {!cli.telefone && <div className="banner warn"><span>!</span><span>Cliente sem telefone — vai abrir o WhatsApp sem número.</span></div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TEMPLATES.map((t) => (
                <button className="row static" key={t.id} style={{ cursor: 'pointer' }}
                  onClick={() => { window.open(waLink(cli.telefone, t.texto({ primeiro: primeiroNome(cli), rep: (profile?.nome || '').split(' ')[0] })), '_blank'); setMsgOpen(false) }}>
                  <div className="grow"><div className="l1">{t.nome}</div></div>
                </button>
              ))}
            </div>
            <button className="btn ghost" style={{ marginTop: 12, width: '100%' }} onClick={() => setMsgOpen(false)}>Fechar</button>
          </div>
        </div>
      )}

      <div className="tabs">
        <button className={'tab ' + (tab === 'rel' ? 'on' : '')} onClick={() => setTab('rel')}>Relacionamento</button>
        <button className={'tab ' + (tab === 'cad' ? 'on' : '')} onClick={() => setTab('cad')}>Cadastro</button>
        <button className={'tab ' + (tab === 'end' ? 'on' : '')} onClick={() => setTab('end')}>Endereços</button>
        <button className={'tab ' + (tab === 'orc' ? 'on' : '')} onClick={() => setTab('orc')}>Orçamentos ({orcs.length})</button>
      </div>

      {tab === 'rel' && (
        <>
          <div className="briefing">
            <div className="k">Antes de visitar — pontos para lembrar</div>
            {pontos.length === 0 && !inter[0] && <div className="line">Ainda sem informações de relacionamento. Registre uma visita.</div>}
            {pontos.map(([k, v]) => (<div className="line" key={k}><b>{PLBL[k] || k}:</b> {v}</div>))}
            <div className="line"><b>Última conversa:</b> {inter[0] ? `“${(inter[0].resumo || '').slice(0, 70)}” · ${diasAtras(inter[0].data)}` : 'sem contato ainda'}</div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Saúde do relacionamento</span><span>{score}/100</span>
            </div>
            <div className="meter"><i style={{ width: score + '%' }} /></div>
          </div>

          {inter.length === 0 ? (
            <div className="empty">Nenhuma interação ainda. Registre a primeira visita.</div>
          ) : (
            inter.map((ev) => (
              <div className="ev" key={ev.id}>
                <div className="h">
                  <span>{ev.tipo === 'ocorrencia' ? '● Evento' : `${canalLabel[ev.canal]} · ${tipoInteracaoLabel[ev.tipo]}`}</span>
                  <span className="faint" style={{ fontWeight: 500, textAlign: 'right' }}>{dataHoraBR(ev.data)}<span style={{ opacity: .7 }}> · {diasAtras(ev.data)}</span></span>
                </div>
                <div className="b">
                  {ev.resumo}
                  {ev.recepcao && <span className={'pill ' + (ev.recepcao === 'boa' ? 'g' : ev.recepcao === 'ruim' ? 'r' : 'n')} style={{ marginLeft: 6 }}>{ev.recepcao}</span>}
                  {ev.obs_entorno && <div className="faint" style={{ marginTop: 3 }}>Entorno: {ev.obs_entorno}</div>}
                  {ev.proxima_acao && <div className="faint" style={{ marginTop: 3 }}>→ {ev.proxima_acao} {ev.proxima_acao_data ? `(${dataBR(ev.proxima_acao_data)})` : ''}</div>}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {tab === 'cad' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <Link className="btn ghost sm" to={`/clientes/${id}/editar`}>Editar cadastro</Link>
          </div>
          <div className="kv">
            <div><span>Razão social</span><span>{cli.razao_social}</span></div>
            <div><span>Pessoa de contato</span><span>{cli.contato_nome ? `${cli.contato_nome}${cli.contato_cargo ? ` — ${cli.contato_cargo}` : ''}` : '—'}</span></div>
            <div><span>CNPJ/CPF</span><span>{cli.cnpj_cpf || '—'}</span></div>
            <div><span>Estado</span><span>{cli.estado || '—'}</span></div>
            <div><span>Cidade</span><span>{cli.cidade || '—'}</span></div>
            <div><span>Tipo</span><span>{tipoClienteLabel[cli.tipo_cliente]}</span></div>
            <div><span>Contribuinte ICMS</span><span>{cli.contribuinte_icms === true ? 'Sim' : cli.contribuinte_icms === false ? 'Não' : '— confirmar'}</span></div>
            <div><span>Matriz/filial</span><span>{cli.matriz_filial}</span></div>
            <div><span>Telefone</span><span>{cli.telefone || '—'}</span></div>
            <div><span>E-mail</span><span>{cli.email || '—'}</span></div>
            <div><span>Consentimento LGPD</span><span>{cli.consentimento_lgpd ? 'Sim' : 'Não'}</span></div>
            <div><span>Atribuído em</span><span>{dataBR(cli.data_primeiro_registro)}</span></div>
          </div>
        </div>
      )}

      {tab === 'end' && <EnderecosCliente clienteId={id} />}

      {tab === 'orc' && (
        orcs.length === 0 ? <div className="empty">Nenhum orçamento. <Link to={`/orcamentos/novo?cliente=${id}`}>Criar o primeiro</Link>.</div> : (
          orcs.map((o) => (
            <button className="row" key={o.id} onClick={() => nav(`/orcamentos/${o.id}`)}>
              <div className="grow">
                <div className="l1">Orçamento #{o.numero}</div>
                <div className="l2">{dataBR(o.created_at)} · {brl(o.valor_total)}</div>
              </div>
              <span className="pill n">{statusLabel[o.status]}</span>
            </button>
          ))
        )
      )}
    </div>
  )
}
