import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Territorios() {
  const [lista, setLista] = useState(null)
  const [nome, setNome] = useState('')
  const [estados, setEstados] = useState('')

  async function load() {
    const { data } = await supabase.from('territorios').select('*').order('nome')
    setLista(data || [])
  }
  useEffect(() => { load() }, [])

  async function add() {
    if (!nome.trim()) return
    await supabase.from('territorios').insert({
      nome, definicao: { estados: estados.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) },
    })
    setNome(''); setEstados(''); load()
  }

  if (lista === null) return <div className="spinner" />

  return (
    <div>
      <div className="page-head"><h1>Territórios</h1></div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid-form">
          <div className="field"><label>Nome</label><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Vale do Itajaí" /></div>
          <div className="field"><label>Estados (vírgula)</label><input className="input" value={estados} onChange={(e) => setEstados(e.target.value)} placeholder="SC, PR" /></div>
        </div>
        <button className="btn" onClick={add}>Adicionar território</button>
      </div>
      {lista.map((t) => (
        <div className="row static" key={t.id}>
          <div className="grow"><div className="l1">{t.nome}</div>
            <div className="l2">{(t.definicao?.estados || []).join(' · ') || '—'} {t.exclusivo ? '· exclusivo' : ''}</div></div>
        </div>
      ))}
    </div>
  )
}
