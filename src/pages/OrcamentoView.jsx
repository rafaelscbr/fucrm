import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { brl, statusLabel, tipoClienteLabel, dataBR, tempoRel } from '../lib/format'
import { logAudit } from '../lib/audit'
import { waLink } from '../lib/whatsapp'

export default function OrcamentoView() {
  const { id } = useParams()
  const nav = useNavigate()
  const { session, isGestor } = useAuth()
  const toast = useToast()
  const [o, setO] = useState(null)
  const [cli, setCli] = useState(null)
  const [itens, setItens] = useState([])
  const [rep, setRep] = useState(null)

  const load = useCallback(async () => {
    const { data: orc } = await supabase.from('orcamentos').select('*, endereco:enderecos(*)').eq('id', id).single()
    setO(orc)
    if (orc) {
      const [{ data: c }, { data: it }, { data: r }] = await Promise.all([
        supabase.from('clientes').select('*').eq('id', orc.cliente_id).single(),
        supabase.from('orcamento_itens').select('*').eq('orcamento_id', id),
        orc.representante_id ? supabase.from('profiles').select('nome,codigo_vendedor_totvs').eq('id', orc.representante_id).single() : Promise.resolve({ data: null }),
      ])
      setCli(c); setItens(it || []); setRep(r)
    }
  }, [id])
  useEffect(() => { load() }, [load])

  async function setStatus(novo, extra = {}) {
    await supabase.from('orcamentos').update({ status: novo, ...extra }).eq('id', id)
    await logAudit('status_orcamento', 'orcamento', id, { status: novo })
    toast('Status: ' + statusLabel[novo])
    load()
  }
  const perder = () => { const m = prompt('Motivo da perda:'); if (m !== null) setStatus('perdido', { motivo_perda: m }) }

  if (!o || !cli) return <div className="spinner" />
  const meu = o.representante_id === session?.user?.id
  const podeAndar = meu || isGestor

  const acoes = []
  if (o.status === 'rascunho' && podeAndar) acoes.push(['Enviar ao cliente', () => setStatus('enviado')])
  if (o.status === 'enviado' && podeAndar) acoes.push(['Cliente aprovou → enviar p/ TOTVS', () => setStatus('aguardando_totvs')])
  if (o.status === 'aguardando_totvs' && isGestor) acoes.push(['Lançar no TOTVS', () => setStatus('lancado_totvs', { aprovado_por: session.user.id, aprovado_em: new Date().toISOString() })])
  if (o.status === 'lancado_totvs' && isGestor) acoes.push(['Marcar faturado', () => setStatus('faturado')])
  const finais = ['faturado', 'perdido', 'cancelado']
  if (!finais.includes(o.status) && podeAndar) acoes.push(['Marcar perdido', perder, 'danger'])

  const ORDEM = ['rascunho', 'enviado', 'aguardando_totvs', 'lancado_totvs', 'faturado']
  const FLUXO = [
    { key: 'rascunho', label: 'Orçamento criado', em: o.created_at },
    { key: 'enviado', label: 'Enviado ao cliente', em: o.enviado_em },
    { key: 'aguardando_totvs', label: 'Cliente aprovou', sub: 'aguardando cadastro no TOTVS', em: o.aprovado_cliente_em },
    { key: 'lancado_totvs', label: 'Lançado no TOTVS', sub: 'pelo gestor', em: o.lancado_em },
    { key: 'faturado', label: 'Faturado pela Fuplastic', sub: 'conta para a meta do representante', em: o.faturado_em },
  ]
  const perdido = o.status === 'perdido' || o.status === 'cancelado'
  let atualIdx = ORDEM.indexOf(o.status)
  if (atualIdx === -1) atualIdx = FLUXO.reduce((acc, s, i) => (s.em ? i : acc), 0)
  const quando = (em, estado) => (em ? `${dataBR(em)} · ${tempoRel(em)}` : estado === 'cur' ? 'em andamento' : '—')

  return (
    <div>
      <button className="back no-print" onClick={() => nav(-1)}>‹ Voltar</button>
      <div className="page-head">
        <h1>Orçamento #{o.numero}</h1>
        <span className={'pill ' + (o.status === 'faturado' ? 'g' : perdido ? 'crit' : 'n')}>{statusLabel[o.status]}</span>
      </div>

      <div className="flow no-print">
        {FLUXO.map((s, i) => {
          const estado = i < atualIdx ? 'done' : i === atualIdx ? (perdido ? 'done' : 'cur') : 'todo'
          return (
            <div key={s.key} className={'flow-step ' + estado}>
              <div className="flow-mark"><span className="flow-dot">{estado === 'done' ? '✓' : ''}</span></div>
              <div className="flow-body">
                <div className="flow-lbl">{s.label}</div>
                {s.sub && <div className="flow-sub">{s.sub}</div>}
                <div className="flow-when">{quando(s.em, estado)}</div>
              </div>
            </div>
          )
        })}
        {perdido && (
          <div className="flow-step lost">
            <div className="flow-mark"><span className="flow-dot">✕</span></div>
            <div className="flow-body">
              <div className="flow-lbl">{o.status === 'cancelado' ? 'Cancelado' : 'Perdido'}</div>
              {o.motivo_perda && <div className="flow-sub">{o.motivo_perda}</div>}
              <div className="flow-when">{quando(o.perdido_em, 'done')}</div>
            </div>
          </div>
        )}
      </div>

      <div className="toolbar no-print">
        {acoes.map(([label, fn, kind]) => (
          <button key={label} className={'btn sm ' + (kind || '')} onClick={fn}>{label}</button>
        ))}
        <button className="btn sm" onClick={() => nav(`/orcamentos/${id}/pdf`)}>Gerar PDF</button>
        <button className="btn ghost sm" onClick={() => nav(`/orcamentos/${id}/imagem`)}>Imagem p/ WhatsApp</button>
      </div>

      <div className="sheet">
        {isGestor && (
          <div className="sheet-h">
            <div>
              <div style={{ fontWeight: 800 }}>Pronto para lançar no TOTVS</div>
              <div className="muted" style={{ fontSize: 12 }}>Vendedor: {rep?.nome || '—'} · cód. {rep?.codigo_vendedor_totvs || '—'}</div>
            </div>
            <span className="src">FONTE = RD STATION</span>
          </div>
        )}
        <div className="grp"><div className="gt">Cabeçalho</div><div className="kv">
          <div><span>Filial</span><span>{o.filial}</span></div>
          <div><span>Data</span><span>{dataBR(o.created_at)}</span></div>
          <div><span>Tipo cliente</span><span>{tipoClienteLabel[cli.tipo_cliente]}</span></div>
        </div></div>
        <div className="grp"><div className="gt">Cliente</div><div className="kv">
          <div><span>Razão social</span><span>{cli.razao_social}</span></div>
          <div><span>CNPJ/CPF</span><span>{cli.cnpj_cpf || '—'}</span></div>
          <div><span>Estado ⚠</span><span>{cli.estado || '—'}</span></div>
          <div><span>Matriz/filial ⚠</span><span>{cli.matriz_filial}</span></div>
        </div></div>
        <div className="grp"><div className="gt">Itens</div><div className="kv">
          {itens.map((i) => (
            <div key={i.id}><span>{i.codigo_inteligente || i.descricao}</span><span>{i.quantidade} · {brl(i.valor_unitario)}</span></div>
          ))}
        </div></div>
        <div className="grp"><div className="gt">Condições</div><div className="kv">
          <div><span>Pagamento</span><span>{o.condicao_pagamento || '—'}</span></div>
          <div><span>Frete</span><span>{o.tipo_frete === 'F' ? 'FOB' : o.tipo_frete}{o.tipo_frete === 'CIF' ? ` · ${brl(o.valor_frete)} · ${o.peso_bruto_total || '?'}kg` : ''}</span></div>
          <div><span>Entrega</span><span>{o.endereco ? [o.endereco.apelido, o.endereco.cidade].filter(Boolean).join(' · ') : 'Mesmo do faturamento'}</span></div>
        </div></div>
        <div className="grp"><div className="gt">Observações</div><div className="kv">
          <div><span>Obs. pedido (interno)</span><span>{o.obs_pedido || '—'}</span></div>
          <div><span>Obs. NF (fiscal)</span><span>{o.obs_nota_fiscal || '—'}</span></div>
        </div></div>
        {o.fiscal && (
          <div className="grp"><div className="gt">Impostos</div><div className="kv">
            <div><span>Característica fiscal</span><span>{o.fiscal.exportacao ? 'Exportação (sem impostos)' : `${o.fiscal.uf || '—'} · ${o.fiscal.contribuinte === true ? 'contribuinte' : o.fiscal.contribuinte === false ? 'não contribuinte' : 'não confirmado'}${o.fiscal.revenda ? ' · revenda' : ''}`}</span></div>
            {o.fiscal.icms_destaque_pct > 0 && <div><span>ICMS incluso no preço</span><span>{o.fiscal.icms_destaque_pct}%</span></div>}
            {o.fiscal.tot_ipi > 0 && <div><span>IPI</span><span>{brl(o.fiscal.tot_ipi)}</span></div>}
            {o.fiscal.tot_st > 0 && <div><span>ICMS-ST (revenda)</span><span>{brl(o.fiscal.tot_st)}</span></div>}
            {o.fiscal.tot_difal > 0 && <div><span>DIFAL {o.fiscal.difal_pp}% (não contribuinte)</span><span>{brl(o.fiscal.tot_difal)}</span></div>}
            {o.fiscal.difal_info > 0 && <div><span>DIFAL por conta do cliente (não somado)</span><span>{brl(o.fiscal.difal_info)}</span></div>}
            {o.fiscal.st_pendente && <div><span>Atenção ⚠</span><span>ST não parametrizado p/ {o.fiscal.uf} — total sem ST</span></div>}
          </div></div>
        )}
        <div className="grp" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: 0 }}>
          <span className="muted">Total</span><span style={{ fontSize: 18, fontWeight: 800 }}>{brl(o.valor_total)}</span>
        </div>
      </div>

      {isGestor && (
        <div className="card no-print" style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Checklist de conferência</h3>
          <ul className="checklist">
            <li>Estado correto? (define a tributação)</li>
            <li>Filial 030201</li>
            <li>Fonte = RD Station marcada</li>
            <li>Código do vendedor presente</li>
            <li>Matriz vs. filial — cliente certo?</li>
            <li>Isenção ICMS/ST documentada (portaria) → Rosane</li>
          </ul>
        </div>
      )}
    </div>
  )
}
