import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { brl, statusLabel, tipoClienteLabel, dataBR } from '../lib/format'
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
  if (o.status === 'enviado' && podeAndar) acoes.push(['Cliente confirmou', () => setStatus('confirmado')])
  if (o.status === 'confirmado' && podeAndar) acoes.push(['Enviar para aprovação', () => setStatus('em_aprovacao')])
  if (o.status === 'em_aprovacao' && isGestor) {
    acoes.push(['Aprovar → Pedido', () => setStatus('aprovado', { aprovado_por: session.user.id, aprovado_em: new Date().toISOString() })])
    acoes.push(['Pedir ajuste', () => setStatus('rascunho'), 'warn'])
  }
  if (o.status === 'aprovado' && isGestor) acoes.push(['Marcar lançado no TOTVS', () => setStatus('lancado_totvs')])
  if (o.status === 'lancado_totvs' && isGestor) acoes.push(['Marcar faturado', () => setStatus('faturado')])
  const finais = ['faturado', 'perdido', 'cancelado']
  if (!finais.includes(o.status) && podeAndar) acoes.push(['Marcar perdido', perder, 'danger'])

  return (
    <div>
      <button className="back no-print" onClick={() => nav(-1)}>‹ Voltar</button>
      <div className="page-head">
        <h1>Orçamento #{o.numero}</h1>
        <span className="pill n">{statusLabel[o.status]}</span>
      </div>

      <div className="toolbar no-print">
        {acoes.map(([label, fn, kind]) => (
          <button key={label} className={'btn sm ' + (kind || '')} onClick={fn}>{label}</button>
        ))}
        <button className="btn sm" onClick={() => nav(`/orcamentos/${id}/pdf`)}>Gerar PDF</button>
        <button className="btn ghost sm" onClick={() => window.open(waLink(cli.telefone, `Olá! Segue o resumo do orçamento #${o.numero} — total ${brl(o.valor_total)}. Qualquer dúvida, estou à disposição!`), '_blank')}>WhatsApp</button>
      </div>

      <div className="sheet">
        <div className="sheet-h">
          <div>
            <div style={{ fontWeight: 800 }}>Pronto para lançar no TOTVS</div>
            <div className="muted" style={{ fontSize: 12 }}>Vendedor: {rep?.nome || '—'} · cód. {rep?.codigo_vendedor_totvs || '—'}</div>
          </div>
          <span className="src">FONTE = RD STATION</span>
        </div>
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
        <div className="grp" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: 0 }}>
          <span className="muted">Total</span><span style={{ fontSize: 18, fontWeight: 800 }}>{brl(o.valor_total)}</span>
        </div>
      </div>

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
    </div>
  )
}
