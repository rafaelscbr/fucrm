import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { brl, tipoClienteLabel, statusLabel, canalLabel, tipoInteracaoLabel, diasAtras, dataBR } from '../lib/format'
import EnderecosCliente from '../components/EnderecosCliente'

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
  const { session } = useAuth()
  const [cli, setCli] = useState(null)
  const [inter, setInter] = useState([])
  const [orcs, setOrcs] = useState([])
  const [tab, setTab] = useState('rel')

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase.from('clientes').select('*').eq('id', id).single()
      setCli(c)
      const { data: i } = await supabase.from('interacoes').select('*').eq('cliente_id', id).order('data', { ascending: false })
      setInter(i || [])
      const { data: o } = await supabase.from('orcamentos').select('id,numero,status,valor_total,created_at').eq('cliente_id', id).order('created_at', { ascending: false })
      setOrcs(o || [])
    }
    load()
  }, [id])

  if (!cli) return <div className="spinner" />
  const dp = cli.dados_pessoais || {}
  const score = healthScore(cli, inter)
  const meu = cli.representante_responsavel_id === session?.user?.id

  return (
    <div>
      <button className="back" onClick={() => nav(-1)}>‹ Clientes</button>
      <div className="page-head">
        <div>
          <h1>{cli.razao_social}</h1>
          <p className="muted" style={{ fontSize: 13 }}>
            {[cli.cidade, cli.estado].filter(Boolean).join(' · ')} · {tipoClienteLabel[cli.tipo_cliente]}
          </p>
        </div>
        {cli.bloqueado ? <span className="pill r">bloqueado</span> : meu ? <span className="pill g">meu</span> : <span className="pill w">outro rep</span>}
      </div>

      <div className="toolbar no-print">
        <Link className="btn" to={`/clientes/${id}/visita`}>＋ Registrar visita</Link>
        <Link className="btn ghost" to={`/orcamentos/novo?cliente=${id}`}>Novo orçamento</Link>
      </div>

      <div className="tabs">
        <button className={'tab ' + (tab === 'rel' ? 'on' : '')} onClick={() => setTab('rel')}>Relacionamento</button>
        <button className={'tab ' + (tab === 'cad' ? 'on' : '')} onClick={() => setTab('cad')}>Cadastro</button>
        <button className={'tab ' + (tab === 'end' ? 'on' : '')} onClick={() => setTab('end')}>Endereços</button>
        <button className={'tab ' + (tab === 'orc' ? 'on' : '')} onClick={() => setTab('orc')}>Orçamentos ({orcs.length})</button>
      </div>

      {tab === 'rel' && (
        <>
          <div className="briefing">
            <div className="k">◆ Antes de visitar</div>
            {dp.aniversario && <div className="line">🎂 Aniversário: <b>{dp.aniversario}</b></div>}
            {dp.familia && <div className="line">👨‍👩‍👧 {dp.familia}</div>}
            {dp.interesses && <div className="line">⚽ {dp.interesses}</div>}
            <div className="line">💬 Última: {inter[0] ? `“${(inter[0].resumo || '').slice(0, 60)}” · ${diasAtras(inter[0].data)}` : 'sem contato ainda'}</div>
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
                  <span>{canalLabel[ev.canal]} · {tipoInteracaoLabel[ev.tipo]}</span>
                  <span className="faint" style={{ fontWeight: 500 }}>{diasAtras(ev.data)}</span>
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
          <div className="kv">
            <div><span>Razão social</span><span>{cli.razao_social}</span></div>
            <div><span>CNPJ/CPF</span><span>{cli.cnpj_cpf || '—'}</span></div>
            <div><span>Estado</span><span>{cli.estado || '—'}</span></div>
            <div><span>Cidade</span><span>{cli.cidade || '—'}</span></div>
            <div><span>Tipo</span><span>{tipoClienteLabel[cli.tipo_cliente]}</span></div>
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
