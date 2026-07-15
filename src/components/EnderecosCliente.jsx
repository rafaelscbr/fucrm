import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const EMPTY = { apelido: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '', contato: '', telefone: '' }

export default function EnderecosCliente({ clienteId }) {
  const [lista, setLista] = useState(null)
  const [f, setF] = useState(EMPTY)
  const [aberto, setAberto] = useState(false)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  async function load() {
    const { data } = await supabase.from('enderecos').select('*').eq('cliente_id', clienteId).order('created_at')
    setLista(data || [])
  }
  useEffect(() => { load() }, [clienteId])

  async function add() {
    if (!f.logradouro && !f.apelido) return
    await supabase.from('enderecos').insert({ ...f, cliente_id: clienteId, principal: lista.length === 0 })
    setF(EMPTY); setAberto(false); load()
  }
  async function remover(id) { await supabase.from('enderecos').delete().eq('id', id); load() }
  async function tornarPrincipal(id) {
    await supabase.from('enderecos').update({ principal: false }).eq('cliente_id', clienteId)
    await supabase.from('enderecos').update({ principal: true }).eq('id', id); load()
  }

  if (lista === null) return <div className="spinner" />

  return (
    <div>
      {lista.length === 0 && !aberto && <div className="empty">Nenhum endereço de entrega cadastrado.</div>}
      {lista.map((e) => (
        <div className="row static" key={e.id}>
          <div className="grow">
            <div className="l1">{e.apelido || 'Endereço'} {e.principal && <span className="pill g">principal</span>}</div>
            <div className="l2">{[[e.logradouro, e.numero].filter(Boolean).join(', '), e.bairro, [e.cidade, e.estado].filter(Boolean).join('/'), e.cep].filter(Boolean).join(' · ')}</div>
            {(e.contato || e.telefone) && <div className="l2">Recebe: {[e.contato, e.telefone].filter(Boolean).join(' · ')}</div>}
          </div>
          {!e.principal && <button className="btn ghost sm" onClick={() => tornarPrincipal(e.id)}>tornar principal</button>}
          <button className="btn danger sm" onClick={() => remover(e.id)}>remover</button>
        </div>
      ))}

      {aberto ? (
        <div className="card" style={{ marginTop: 10 }}>
          <div className="grid-form">
            <div className="field"><label>Apelido</label><input className="input" value={f.apelido} onChange={(e) => set('apelido', e.target.value)} placeholder="Obra Centro / Depósito" /></div>
            <div className="field"><label>CEP</label><input className="input" value={f.cep} onChange={(e) => set('cep', e.target.value)} /></div>
            <div className="field full"><label>Logradouro</label><input className="input" value={f.logradouro} onChange={(e) => set('logradouro', e.target.value)} /></div>
            <div className="field"><label>Número</label><input className="input" value={f.numero} onChange={(e) => set('numero', e.target.value)} /></div>
            <div className="field"><label>Bairro</label><input className="input" value={f.bairro} onChange={(e) => set('bairro', e.target.value)} /></div>
            <div className="field"><label>Cidade</label><input className="input" value={f.cidade} onChange={(e) => set('cidade', e.target.value)} /></div>
            <div className="field"><label>Estado</label><input className="input" value={f.estado} onChange={(e) => set('estado', e.target.value)} /></div>
            <div className="field"><label>Contato (quem recebe)</label><input className="input" value={f.contato} onChange={(e) => set('contato', e.target.value)} /></div>
            <div className="field"><label>Telefone</label><input className="input" value={f.telefone} onChange={(e) => set('telefone', e.target.value)} /></div>
          </div>
          <div className="toolbar">
            <button className="btn" onClick={add}>Salvar endereço</button>
            <button className="btn ghost" onClick={() => { setAberto(false); setF(EMPTY) }}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button className="btn" style={{ marginTop: 10 }} onClick={() => setAberto(true)}>＋ Adicionar endereço de entrega</button>
      )}
    </div>
  )
}
