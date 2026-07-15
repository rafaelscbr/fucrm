import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { brl, tempoRel } from '../../lib/format'
import { logAudit } from '../../lib/audit'

export default function Aprovacoes() {
  const nav = useNavigate()
  const { session } = useAuth()
  const toast = useToast()
  const [orcs, setOrcs] = useState(null)
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('orcamentos')
      .select('id,numero,status,valor_total,created_at,aprovado_cliente_em,lancado_em,cliente:clientes(razao_social,estado),rep:profiles!representante_id(nome)')
      .in('status', ['aguardando_totvs', 'lancado_totvs'])
      .order('created_at', { ascending: true })
    setOrcs(data || [])
  }, [])
  useEffect(() => { load() }, [load])

  async function avancar(o, novo, extra = {}) {
    setBusy(o.id)
    setOrcs((arr) => arr.map((x) => (x.id === o.id ? { ...x, status: novo } : x)))
    await supabase.from('orcamentos').update({ status: novo, ...extra }).eq('id', o.id)
    await logAudit('status_orcamento', 'orcamento', o.id, { status: novo })
    toast(novo === 'lancado_totvs' ? 'Lançado no TOTVS — representante avisado.' : 'Faturado! Conta para a meta.')
    setBusy(null)
    load()
  }
  const lancar = (o) => avancar(o, 'lancado_totvs', { aprovado_por: session.user.id, aprovado_em: new Date().toISOString() })
  const faturar = (o) => avancar(o, 'faturado')

  if (orcs === null) return <div className="spinner" />
  const aguardando = orcs.filter((o) => o.status === 'aguardando_totvs')
  const lancados = orcs.filter((o) => o.status === 'lancado_totvs')

  const Linha = (o, acao, quando) => (
    <div className="row totvs-row" key={o.id}>
      <button className="grow linkish" onClick={() => nav(`/orcamentos/${o.id}`)}>
        <div className="l1">#{o.numero} · {o.cliente?.razao_social}</div>
        <div className="l2">{o.rep?.nome || '—'}{o.cliente?.estado ? ' · ' + o.cliente.estado : ''} · {quando}</div>
      </button>
      <b className="totvs-val">{brl(o.valor_total)}</b>
      {acao}
    </div>
  )

  return (
    <div>
      <div className="page-head"><h1>Cadastro no TOTVS</h1><span className="pill w">{aguardando.length} para cadastrar</span></div>
      <p className="hint">O representante é avisado automaticamente quando você lança e quando fatura. Aja direto pelos botões — sem abrir cada orçamento.</p>

      <h3 className="totvs-sec">Aguardando cadastro <span className="totvs-cnt">{aguardando.length}</span></h3>
      {aguardando.length === 0 ? <div className="empty">Nada aguardando cadastro no TOTVS.</div> : (
        aguardando.map((o) => Linha(o,
          <button className="btn sm" disabled={busy === o.id} onClick={() => lancar(o)}>Lançar no TOTVS</button>,
          o.aprovado_cliente_em ? 'aprovado ' + tempoRel(o.aprovado_cliente_em) : 'aprovado'))
      )}

      <h3 className="totvs-sec" style={{ marginTop: 22 }}>Lançados · aguardando faturamento <span className="totvs-cnt">{lancados.length}</span></h3>
      {lancados.length === 0 ? <div className="empty">Nenhum lançamento aguardando faturamento.</div> : (
        lancados.map((o) => Linha(o,
          <button className="btn sm ghost" disabled={busy === o.id} onClick={() => faturar(o)}>Marcar faturado</button>,
          o.lancado_em ? 'lançado ' + tempoRel(o.lancado_em) : 'lançado'))
      )}
    </div>
  )
}
