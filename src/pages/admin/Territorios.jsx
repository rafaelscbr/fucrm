import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Territorios() {
  const [lista, setLista] = useState(null)
  const [reps, setReps] = useState([])
  const [links, setLinks] = useState([])
  const [nome, setNome] = useState('')
  const [estados, setEstados] = useState('')
  const [novaCidade, setNovaCidade] = useState({})

  async function load() {
    const [{ data: t }, { data: r }, { data: l }] = await Promise.all([
      supabase.from('territorios').select('*').order('nome'),
      supabase.from('profiles').select('id,nome,papel').order('nome'),
      supabase.from('representante_territorios').select('*'),
    ])
    setLista(t || [])
    setReps((r || []).filter((x) => x.papel === 'representante'))
    setLinks(l || [])
  }
  useEffect(() => { load() }, [])

  async function addTerr() {
    if (!nome.trim()) return
    await supabase.from('territorios').insert({
      nome, definicao: { estados: estados.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean), cidades: [] },
    })
    setNome(''); setEstados(''); load()
  }
  async function salvarDef(t, definicao) {
    await supabase.from('territorios').update({ definicao }).eq('id', t.id); load()
  }
  async function addCidade(t) {
    const c = (novaCidade[t.id] || '').trim()
    if (!c) return
    const cidades = [...(t.definicao?.cidades || [])]
    if (!cidades.includes(c)) cidades.push(c)
    setNovaCidade((s) => ({ ...s, [t.id]: '' }))
    salvarDef(t, { ...(t.definicao || {}), cidades })
  }
  const rmCidade = (t, c) => salvarDef(t, { ...(t.definicao || {}), cidades: (t.definicao?.cidades || []).filter((x) => x !== c) })

  async function vincular(tid, rid) { if (!rid) return; await supabase.from('representante_territorios').insert({ territorio_id: tid, representante_id: rid }); load() }
  async function desvincular(tid, rid) { await supabase.from('representante_territorios').delete().eq('territorio_id', tid).eq('representante_id', rid); load() }
  async function removerTerr(id) { await supabase.from('territorios').delete().eq('id', id); load() }

  if (lista === null) return <div className="spinner" />
  const repsDe = (tid) => links.filter((l) => l.territorio_id === tid).map((l) => reps.find((r) => r.id === l.representante_id)).filter(Boolean)

  return (
    <div>
      <div className="page-head"><h1>Territórios</h1></div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid-form">
          <div className="field"><label>Nome do território</label><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Vale do Itajaí" /></div>
          <div className="field"><label>Estados (vírgula)</label><input className="input" value={estados} onChange={(e) => setEstados(e.target.value)} placeholder="SC" /></div>
        </div>
        <button className="btn" onClick={addTerr}>Criar território</button>
      </div>

      {lista.map((t) => {
        const assigned = repsDe(t.id)
        const disponiveis = reps.filter((r) => !assigned.find((a) => a.id === r.id))
        const cidades = t.definicao?.cidades || []
        return (
          <div className="card" key={t.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{t.nome}</div>
                <div className="muted" style={{ fontSize: 12 }}>{(t.definicao?.estados || []).join(' · ') || 'sem estados'}</div>
              </div>
              <button className="btn danger sm" onClick={() => removerTerr(t.id)}>excluir</button>
            </div>

            <div className="hint" style={{ margin: '14px 0 6px' }}>Cidades de atuação</div>
            <div className="chips" style={{ margin: '0 0 8px' }}>
              {cidades.length === 0 && <span className="muted" style={{ fontSize: 13 }}>Nenhuma cidade ainda</span>}
              {cidades.map((c) => <span className="chip on" key={c} style={{ cursor: 'pointer' }} onClick={() => rmCidade(t, c)}>{c} ✕</span>)}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Adicionar cidade (ex.: Blumenau)"
                value={novaCidade[t.id] || ''} onChange={(e) => setNovaCidade((s) => ({ ...s, [t.id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addCidade(t)} />
              <button className="btn sm" onClick={() => addCidade(t)}>Adicionar</button>
            </div>

            <div className="hint" style={{ margin: '16px 0 6px' }}>Representantes</div>
            <div className="chips" style={{ margin: '0 0 8px' }}>
              {assigned.length === 0 && <span className="muted" style={{ fontSize: 13 }}>Nenhum representante vinculado</span>}
              {assigned.map((r) => <span className="chip on" key={r.id} style={{ cursor: 'pointer' }} onClick={() => desvincular(t.id, r.id)}>{r.nome} ✕</span>)}
            </div>
            <select className="select" value="" onChange={(e) => vincular(t.id, e.target.value)}>
              <option value="">+ Vincular representante…</option>
              {disponiveis.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </div>
        )
      })}
    </div>
  )
}
