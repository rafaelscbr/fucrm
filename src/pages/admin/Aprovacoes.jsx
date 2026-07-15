import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { brl } from '../../lib/format'

export default function Aprovacoes() {
  const nav = useNavigate()
  const [orcs, setOrcs] = useState(null)
  useEffect(() => {
    supabase.from('orcamentos')
      .select('id,numero,valor_total,cliente:clientes(razao_social,estado),rep:profiles!representante_id(nome)')
      .eq('status', 'em_aprovacao').order('created_at', { ascending: true })
      .then(({ data }) => setOrcs(data || []))
  }, [])
  if (orcs === null) return <div className="spinner" />

  return (
    <div>
      <div className="page-head"><h1>Fila de aprovação</h1><span className="pill w">{orcs.length} pendentes</span></div>
      {orcs.length === 0 ? <div className="empty">Nenhum orçamento aguardando aprovação.</div> : (
        orcs.map((o) => (
          <button className="row" key={o.id} onClick={() => nav(`/orcamentos/${o.id}`)}>
            <div className="grow">
              <div className="l1">#{o.numero} · {o.cliente?.razao_social}</div>
              <div className="l2">{o.rep?.nome} · {o.cliente?.estado}</div>
            </div>
            <b>{brl(o.valor_total)}</b>
          </button>
        ))
      )}
    </div>
  )
}
