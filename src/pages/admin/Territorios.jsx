import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Territorios() {
  const [lista, setLista] = useState(null)
  const [reps, setReps] = useState([])
  const [links, setLinks] = useState([])
  const [nome, setNome] = useState('')
  const [estados, setEstados] = useState('')

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
      nome, definicao: { estados: estados.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) },
    })
    setNome(''); setEstados(''); load()
  }
  async function vincular(territorio_id, representante_id) {
    if (!representante_id) return
    await supabase.from('representante_territorios').insert({ territorio_id, representante_id }); load()
  }
  async function desvincular(territorio_id, representante_id) {
    await supabase.from('representante_territorios').delete().eq('territorio_id', territorio_id).eq('representante_id', representante_id); load()
  }

  if (lista === null) return <div className="spinner" />
  const repsDe = (tid) => links.filter((l) => l.territorio_id === tid).map((l) => reps.find((r) => r.id === l.representante_id)).filter(Boolean)

  return (
    <div>
      <div className="page-head"><h1>Territórios</h1></div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid-form">
          <div className="field"><label>Nome</label><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Vale do Itajaí" /></div>
          <div className="field"><label>Estados (vírgula)</label><input className="input" value={estados} onChange={(e) => setEstados(e.target.value)} placeholder="SC, PR" /></div>
        </div>
        <button className="btn" onClick={addTerr}>Adicionar território</button>
      </div>

      {lista.map((t) => {
        const assigned = repsDe(t.id)
        const disponiveis = reps.filter((r) => !assigned.find((a) => a.id === r.id))
        return (
          <div className="card" key={t.id} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>{t.nome}</div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>{(t.definicao?.estados || []).join(' · ') || 'sem estados'}</div>
            <div className="chips" style={{ margin: '0 0 10px' }}>
              {assigned.length === 0 && <span className="muted" style={{ fontSize: 13 }}>Nenhum representante vinculado</span>}
              {assigned.map((r) => (
                <span className="chip on" key={r.id} style={{ cursor: 'pointer' }} onClick={() => desvincular(t.id, r.id)}>{r.nome} ✕</span>
              ))}
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
