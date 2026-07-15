import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function CarteiraInterna() {
  const [lista, setLista] = useState(null)
  const [f, setF] = useState({ razao_social: '', cnpj_cpf: '', motivo: '', responsavel_interno: '' })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  async function load() {
    const { data } = await supabase.from('carteira_interna').select('*').order('created_at', { ascending: false })
    setLista(data || [])
  }
  useEffect(() => { load() }, [])

  async function add() {
    if (!f.razao_social.trim()) return
    await supabase.from('carteira_interna').insert(f)
    setF({ razao_social: '', cnpj_cpf: '', motivo: '', responsavel_interno: '' }); load()
  }
  async function remover(id) {
    await supabase.from('carteira_interna').delete().eq('id', id); load()
  }

  if (lista === null) return <div className="spinner" />

  return (
    <div>
      <div className="page-head"><h1>Carteira interna (bloqueio)</h1></div>
      <p className="hint">Clientes atendidos pela matriz — os representantes não podem trabalhá-los.</p>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid-form">
          <div className="field"><label>Razão social</label><input className="input" value={f.razao_social} onChange={(e) => set('razao_social', e.target.value)} /></div>
          <div className="field"><label>CNPJ/CPF</label><input className="input" value={f.cnpj_cpf} onChange={(e) => set('cnpj_cpf', e.target.value)} /></div>
          <div className="field"><label>Motivo</label><input className="input" value={f.motivo} onChange={(e) => set('motivo', e.target.value)} /></div>
          <div className="field"><label>Responsável interno</label><input className="input" value={f.responsavel_interno} onChange={(e) => set('responsavel_interno', e.target.value)} /></div>
        </div>
        <button className="btn" onClick={add}>Bloquear cliente</button>
      </div>
      {lista.map((c) => (
        <div className="row static" key={c.id}>
          <div className="grow"><div className="l1">{c.razao_social}</div>
            <div className="l2">{[c.cnpj_cpf, c.motivo, c.responsavel_interno].filter(Boolean).join(' · ')}</div></div>
          <button className="btn danger sm" onClick={() => remover(c.id)}>remover</button>
        </div>
      ))}
    </div>
  )
}
