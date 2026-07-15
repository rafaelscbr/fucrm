import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function CondicoesPagamento() {
  const [lista, setLista] = useState(null)
  const [f, setF] = useState({ codigo: '', descricao: '' })

  async function load() {
    const { data } = await supabase.from('condicoes_pagamento').select('*').order('ordem')
    setLista(data || [])
  }
  useEffect(() => { load() }, [])

  async function add() {
    if (!f.descricao.trim()) return
    await supabase.from('condicoes_pagamento').insert({ codigo: f.codigo || null, descricao: f.descricao, ordem: (lista?.length || 0) + 1 })
    setF({ codigo: '', descricao: '' }); load()
  }
  async function toggle(c) { await supabase.from('condicoes_pagamento').update({ ativo: !c.ativo }).eq('id', c.id); load() }
  async function remover(id) { await supabase.from('condicoes_pagamento').delete().eq('id', id); load() }

  if (lista === null) return <div className="spinner" />

  return (
    <div>
      <div className="page-head"><h1>Condições de pagamento</h1></div>
      <p className="hint">Aparecem como opções ao montar o orçamento.</p>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid-form">
          <div className="field"><label>Código (TOTVS)</label><input className="input" value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} placeholder="007" /></div>
          <div className="field"><label>Descrição</label><input className="input" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="28 / 56 dias" /></div>
        </div>
        <button className="btn" onClick={add}>Adicionar condição</button>
      </div>
      {lista.map((c) => (
        <div className="row static" key={c.id}>
          <div className="grow"><div className="l1">{c.descricao}</div><div className="l2">cód. {c.codigo || '—'}</div></div>
          <button className="btn ghost sm" onClick={() => toggle(c)}>{c.ativo ? 'ativo' : 'inativo'}</button>
          <button className="btn danger sm" onClick={() => remover(c.id)}>remover</button>
        </div>
      ))}
    </div>
  )
}
