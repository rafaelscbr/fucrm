import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { montarCodigo } from '../../lib/produtos'

export default function Catalogo() {
  const [lista, setLista] = useState(null)
  const [f, setF] = useState({ tipo: 'Caixa ST', comprimento: '', largura: '', altura: '', descricao: '', linha: 'infraestrutura', peso: '' })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const codigo = useMemo(() => montarCodigo(f), [f])

  async function load() {
    const { data } = await supabase.from('produtos').select('*').order('codigo_inteligente')
    setLista(data || [])
  }
  useEffect(() => { load() }, [])

  async function add() {
    if (!f.comprimento) return
    await supabase.from('produtos').insert({
      codigo_inteligente: codigo, tipo: f.tipo,
      comprimento_mm: Number(f.comprimento) || null, largura_mm: Number(f.largura) || null,
      altura_mm: f.tipo === 'Tampa ST' ? null : Number(f.altura) || null,
      descricao: f.descricao || `${f.tipo} ${f.comprimento}x${f.largura}${f.altura ? 'x' + f.altura : ''}`,
      linha: f.linha, peso_bruto_kg: Number(f.peso) || null,
    })
    setF({ tipo: 'Caixa ST', comprimento: '', largura: '', altura: '', descricao: '', linha: 'infraestrutura', peso: '' })
    load()
  }

  if (lista === null) return <div className="spinner" />

  return (
    <div>
      <div className="page-head"><h1>Catálogo</h1></div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid-form">
          <div className="field"><label>Tipo</label>
            <select className="select" value={f.tipo} onChange={(e) => set('tipo', e.target.value)}>
              <option>Caixa ST</option><option>Tampa ST</option></select></div>
          <div className="field"><label>Linha</label>
            <select className="select" value={f.linha} onChange={(e) => set('linha', e.target.value)}>
              <option value="infraestrutura">Infraestrutura</option><option value="moradia">Moradia</option>
              <option value="varejo">Varejo</option><option value="agro">Agro</option></select></div>
          <div className="field"><label>Comprimento (mm)</label><input className="input" type="number" value={f.comprimento} onChange={(e) => set('comprimento', e.target.value)} /></div>
          <div className="field"><label>Largura (mm)</label><input className="input" type="number" value={f.largura} onChange={(e) => set('largura', e.target.value)} /></div>
          {f.tipo !== 'Tampa ST' && <div className="field"><label>Altura (mm)</label><input className="input" type="number" value={f.altura} onChange={(e) => set('altura', e.target.value)} /></div>}
          <div className="field"><label>Peso bruto (kg)</label><input className="input" type="number" step="0.1" value={f.peso} onChange={(e) => set('peso', e.target.value)} /></div>
        </div>
        <div className="banner info"><span>Código gerado:</span><b>{codigo}</b></div>
        <button className="btn" onClick={add}>Adicionar produto</button>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Código</th><th>Descrição</th><th>Peso</th></tr></thead>
          <tbody>{lista.map((p) => (
            <tr key={p.id}><td>{p.codigo_inteligente}</td><td>{p.descricao}</td><td>{p.peso_bruto_kg ? p.peso_bruto_kg + ' kg' : '—'}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
