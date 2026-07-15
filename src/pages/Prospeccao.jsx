import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { logAudit } from '../lib/audit'

const COLS = [
  ['lead', 'Lead', 'contato ainda não feito', '#5aa2f0'],
  ['prospect', 'Prospect', 'contato feito, avaliando', '#e3a53a'],
  ['cliente', 'Cliente', 'orçamento aprovado', '#00a838'],
  ['descartado', 'Descartado', 'não avançou', '#94a3b8'],
]
const EMPTY = { razao_social: '', telefone: '', cidade: '', estado: 'SC', origem: '' }
const MOTIVOS_DESCARTE = [
  'Preço acima do esperado',
  'Comprou do concorrente',
  'Sem necessidade no momento',
  'Sem verba / orçamento',
  'Não retornou os contatos',
  'Já tem fornecedor fixo',
  'Produto não atende à necessidade',
  'Fora da área de atuação',
  'Frete / distância inviável',
]

export default function Prospeccao() {
  const nav = useNavigate()
  const { session, isGestor } = useAuth()
  const toast = useToast()
  const [clientes, setClientes] = useState(null)
  const [drag, setDrag] = useState(null)
  const [over, setOver] = useState(null)
  const [novo, setNovo] = useState(null) // null = fechado; objeto = form aberto
  const [salvando, setSalvando] = useState(false)
  const [descarte, setDescarte] = useState(null) // card sendo descartado
  const [motivoOutro, setMotivoOutro] = useState('')

  async function load() {
    let q = supabase.from('clientes')
      .select('id,razao_social,cidade,estado,estagio,representante_responsavel_id,rep:profiles!representante_responsavel_id(nome)')
      .order('created_at', { ascending: false })
    if (!isGestor) q = q.eq('representante_responsavel_id', session.user.id)
    const { data } = await q
    setClientes(data || [])
  }
  useEffect(() => { load() }, [])

  async function moverPara(card, estagio, motivo = null) {
    setClientes((cs) => cs.map((c) => (c.id === card.id ? { ...c, estagio } : c)))
    await supabase.from('clientes').update({ estagio, ...(estagio === 'descartado' ? { motivo_perda_prospec: motivo } : {}) }).eq('id', card.id)
    logAudit('estagio_conta', 'cliente', card.id, { estagio, motivo })
  }
  function drop(estagio) {
    const card = drag
    setOver(null); setDrag(null)
    if (!card || card.estagio === estagio) return
    if (estagio === 'descartado') { setDescarte(card); return } // pede motivo no modal
    moverPara(card, estagio)
  }
  function confirmarDescarte(motivo) {
    if (!motivo) return
    moverPara(descarte, 'descartado', motivo)
    setDescarte(null); setMotivoOutro('')
  }

  async function salvarLead() {
    if (!novo.razao_social.trim()) return
    setSalvando(true)
    const { error } = await supabase.from('clientes').insert({
      ...novo, estagio: 'lead',
      representante_responsavel_id: session.user.id, created_by: session.user.id,
    })
    setSalvando(false)
    if (error) { toast('Não foi possível salvar o lead.', 'erro'); return }
    setNovo(null); toast('Lead cadastrado'); load()
  }

  if (clientes === null) return <div className="spinner" />
  const abertos = clientes.filter((c) => c.estagio === 'lead' || c.estagio === 'prospect').length

  return (
    <div>
      <div className="page-head">
        <h1>Prospecção</h1>
        <button className="btn" onClick={() => setNovo(EMPTY)}>＋ Novo lead</button>
      </div>
      <p className="hint">Funil de aquisição · {abertos} em aberto. Arraste para avançar. Registrar uma visita move o Lead para Prospect; aprovar um orçamento vira Cliente — automaticamente.</p>

      <div className="board">
        {COLS.map(([st, label, desc, cor]) => {
          const cards = clientes.filter((c) => c.estagio === st)
          const mostrar = ['cliente', 'descartado'].includes(st) ? cards.slice(0, 12) : cards
          return (
            <div key={st}
              className={'kcol kfase' + (over === st ? ' drop' : '')}
              style={{ background: `color-mix(in srgb, ${cor} 9%, var(--surface))`, borderTop: `3px solid ${cor}` }}
              onDragOver={(e) => { e.preventDefault(); setOver(st) }}
              onDragLeave={() => setOver((o) => (o === st ? null : o))}
              onDrop={() => drop(st)}>
              <div className="kh">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: cor, flex: '0 0 auto' }} />{label}
                </span>
                <span className="c" style={{ color: cor, borderColor: cor }}>{cards.length}</span>
              </div>
              {desc && <div className="m" style={{ margin: '-2px 0 9px', color: 'var(--faint)' }}>{desc}</div>}
              {mostrar.map((c) => (
                <div className="kcard" key={c.id} draggable
                  onDragStart={() => setDrag(c)} onClick={() => nav(`/clientes/${c.id}`)}>
                  <div className="n1"><span>{c.razao_social}</span></div>
                  <div className="m">{[c.cidade, c.estado].filter(Boolean).join(' · ')}{c.rep?.nome ? ' · ' + c.rep.nome.split(' ')[0] : ''}</div>
                </div>
              ))}
              {['cliente', 'descartado'].includes(st) && cards.length > 12 && (
                <div className="m" style={{ textAlign: 'center', color: 'var(--faint)', padding: '4px 0' }}>+{cards.length - 12} mais</div>
              )}
            </div>
          )
        })}
      </div>

      {descarte && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDescarte(null)}>
          <div className="modal">
            <h3 style={{ marginBottom: 4 }}>Descartar “{descarte.razao_social}”</h3>
            <p className="hint" style={{ marginBottom: 14 }}>Por que não avançou? O motivo vira relatório depois.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MOTIVOS_DESCARTE.map((m) => (
                <button className="row static" key={m} style={{ cursor: 'pointer', marginBottom: 0 }} onClick={() => confirmarDescarte(m)}>
                  <div className="grow"><div className="l1" style={{ fontSize: 14 }}>{m}</div></div>
                </button>
              ))}
            </div>
            <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
              <label>Outro motivo</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" value={motivoOutro} onChange={(e) => setMotivoOutro(e.target.value)} placeholder="Descreva…" />
                <button className="btn" disabled={!motivoOutro.trim()} onClick={() => confirmarDescarte(motivoOutro.trim())}>OK</button>
              </div>
            </div>
            <button className="btn ghost" style={{ marginTop: 12, width: '100%' }} onClick={() => setDescarte(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {novo && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setNovo(null)}>
          <div className="modal">
            <h3 style={{ marginBottom: 4 }}>Novo lead</h3>
            <p className="hint" style={{ marginBottom: 14 }}>Cadastro rápido — só o essencial. O resto você completa quando fizer contato.</p>
            <div className="field"><label>Empresa / contato *</label>
              <input className="input" value={novo.razao_social} onChange={(e) => setNovo({ ...novo, razao_social: e.target.value })} autoFocus /></div>
            <div className="grid-form">
              <div className="field"><label>Telefone</label>
                <input className="input" value={novo.telefone} onChange={(e) => setNovo({ ...novo, telefone: e.target.value })} /></div>
              <div className="field"><label>Origem</label>
                <input className="input" value={novo.origem} onChange={(e) => setNovo({ ...novo, origem: e.target.value })} placeholder="indicação, obra, feira…" /></div>
              <div className="field"><label>Cidade</label>
                <input className="input" value={novo.cidade} onChange={(e) => setNovo({ ...novo, cidade: e.target.value })} /></div>
              <div className="field"><label>Estado</label>
                <input className="input" value={novo.estado} onChange={(e) => setNovo({ ...novo, estado: e.target.value.toUpperCase().slice(0, 2) })} /></div>
            </div>
            <div className="toolbar" style={{ marginTop: 4 }}>
              <button className="btn" onClick={salvarLead} disabled={salvando || !novo.razao_social.trim()}>{salvando ? 'Salvando…' : 'Salvar lead'}</button>
              <button className="btn ghost" onClick={() => setNovo(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
