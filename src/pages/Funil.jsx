import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { brl } from '../lib/format'
import { logAudit } from '../lib/audit'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const COLS = [
  ['rascunho', 'Rascunho'], ['enviado', 'Enviado ao cliente'], ['aguardando_totvs', 'Aguardando TOTVS'],
  ['lancado_totvs', 'Lançado TOTVS'], ['faturado', 'Faturado'],
]
const SO_GESTOR = ['lancado_totvs', 'faturado']

export default function Funil() {
  const nav = useNavigate()
  const { isGestor } = useAuth()
  const toast = useToast()
  const [orcs, setOrcs] = useState(null)
  const [drag, setDrag] = useState(null)
  const [over, setOver] = useState(null)

  async function load() {
    const { data } = await supabase.from('orcamentos')
      .select('id,numero,status,valor_total,cliente:clientes(razao_social,estado)')
      .order('created_at', { ascending: false })
    setOrcs(data || [])
  }
  useEffect(() => { load() }, [])

  async function drop(status) {
    const card = drag
    setOver(null); setDrag(null)
    if (!card || card.status === status) return
    if (SO_GESTOR.includes(status) && !isGestor) { toast('Só o gestor lança/fatura no TOTVS.', 'erro'); return }
    setOrcs((o) => o.map((x) => (x.id === card.id ? { ...x, status } : x)))
    const extra = status === 'lancado_totvs' ? { aprovado_em: new Date().toISOString() } : {}
    await supabase.from('orcamentos').update({ status, ...extra }).eq('id', card.id)
    logAudit('status_orcamento', 'orcamento', card.id, { status })
  }

  if (orcs === null) return <div className="spinner" />

  return (
    <div>
      <div className="page-head"><h1>Funil</h1></div>
      <p className="hint">Arraste um card para mudar a etapa · toque para abrir. No celular, deslize as colunas.</p>
      <div className="board">
        {COLS.map(([st, label]) => {
          const cards = orcs.filter((o) => o.status === st)
          return (
            <div key={st}
              className={'kcol' + (st === 'aguardando_totvs' ? ' gate' : '') + (over === st ? ' drop' : '')}
              onDragOver={(e) => { e.preventDefault(); setOver(st) }}
              onDragLeave={() => setOver((o) => (o === st ? null : o))}
              onDrop={() => drop(st)}>
              <div className="kh"><span>{label}</span><span className="c">{cards.length}</span></div>
              {cards.map((c) => (
                <div className="kcard" key={c.id} draggable
                  onDragStart={() => setDrag(c)} onClick={() => nav(`/orcamentos/${c.id}`)}>
                  <div className="n1"><span>{c.cliente?.razao_social || '—'}</span><b>{brl(c.valor_total)}</b></div>
                  <div className="m">#{c.numero}{c.cliente?.estado ? ' · ' + c.cliente.estado : ''}</div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
