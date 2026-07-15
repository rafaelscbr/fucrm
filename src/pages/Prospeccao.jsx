import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { logAudit } from '../lib/audit'

const COLS = [
  ['suspeito', 'Suspeito'], ['contato', 'Contato feito'], ['qualificado', 'Qualificado'],
  ['demonstracao', 'Demonstração'], ['ganho', 'Ganho'], ['perdido', 'Perdido'],
]

export default function Prospeccao() {
  const nav = useNavigate()
  const { session, isGestor } = useAuth()
  const [clientes, setClientes] = useState(null)
  const [drag, setDrag] = useState(null)
  const [over, setOver] = useState(null)

  async function load() {
    let q = supabase.from('clientes')
      .select('id,razao_social,cidade,estado,estagio_prospeccao,representante_responsavel_id,rep:profiles!representante_responsavel_id(nome)')
      .order('razao_social')
    if (!isGestor) q = q.eq('representante_responsavel_id', session.user.id)
    const { data } = await q
    setClientes(data || [])
  }
  useEffect(() => { load() }, [])

  async function drop(estagio) {
    const card = drag
    setOver(null); setDrag(null)
    if (!card || card.estagio_prospeccao === estagio) return
    let motivo = null
    if (estagio === 'perdido') { motivo = prompt('Motivo de não avançar com este prospect:') }
    setClientes((cs) => cs.map((c) => (c.id === card.id ? { ...c, estagio_prospeccao: estagio } : c)))
    await supabase.from('clientes').update({ estagio_prospeccao: estagio, ...(estagio === 'perdido' ? { motivo_perda_prospec: motivo } : {}) }).eq('id', card.id)
    logAudit('estagio_prospeccao', 'cliente', card.id, { estagio })
  }

  if (clientes === null) return <div className="spinner" />
  const total = clientes.filter((c) => !['ganho', 'perdido'].includes(c.estagio_prospeccao)).length

  return (
    <div>
      <div className="page-head">
        <h1>Prospecção</h1>
        <span className="pill n">{total} em aberto</span>
      </div>
      <p className="hint">Funil de novos clientes · arraste o card para avançar o prospect. Ao chegar em “Ganho”, ele vira cliente ativo.</p>
      <div className="board">
        {COLS.map(([st, label]) => {
          const cards = clientes.filter((c) => c.estagio_prospeccao === st)
          return (
            <div key={st}
              className={'kcol' + (st === 'ganho' ? ' gate' : '') + (over === st ? ' drop' : '')}
              onDragOver={(e) => { e.preventDefault(); setOver(st) }}
              onDragLeave={() => setOver((o) => (o === st ? null : o))}
              onDrop={() => drop(st)}>
              <div className="kh"><span>{label}</span><span className="c">{cards.length}</span></div>
              {(['ganho', 'perdido'].includes(st) ? cards.slice(0, 12) : cards).map((c) => (
                <div className="kcard" key={c.id} draggable
                  onDragStart={() => setDrag(c)} onClick={() => nav(`/clientes/${c.id}`)}>
                  <div className="n1"><span>{c.razao_social}</span></div>
                  <div className="m">{[c.cidade, c.estado].filter(Boolean).join(' · ')}{c.rep?.nome ? ' · ' + c.rep.nome.split(' ')[0] : ''}</div>
                </div>
              ))}
              {['ganho', 'perdido'].includes(st) && cards.length > 12 && (
                <div className="m" style={{ textAlign: 'center', color: 'var(--faint)', padding: '4px 0' }}>+{cards.length - 12} mais</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
