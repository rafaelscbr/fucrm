import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { matchProduto, tipoTotvsLabel } from '../../lib/produtos'

const ORIGEM = {
  '0': 'Nacional', '1': 'Import. direta', '2': 'Import. mercado int.', '3': 'Nacional >40% imp.',
  '4': 'Nacional proc. básico', '5': 'Nacional <40% imp.', '6': 'Import. sem similar', '7': 'Import. merc. int. s/ similar', '8': 'Nacional >70% imp.',
}
const LIMITE = 200

export default function Catalogo() {
  const [lista, setLista] = useState(null)
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('')

  useEffect(() => {
    supabase.from('produtos')
      .select('id,codigo_totvs,descricao,tipo_totvs,unidade,grupo_totvs,ncm,cest,origem_fiscal,grupo_tributario,peso_liquido_kg,ativo,bloqueado')
      .order('descricao')
      .then(({ data }) => setLista(data || []))
  }, [])

  const tipos = useMemo(() => {
    if (!lista) return []
    const m = {}
    lista.forEach((p) => { m[p.tipo_totvs] = (m[p.tipo_totvs] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [lista])

  const filtrados = useMemo(() => {
    if (!lista) return []
    return lista.filter((p) => (!tipo || p.tipo_totvs === tipo) && matchProduto(p, busca))
  }, [lista, busca, tipo])

  if (lista === null) return <div className="spinner" />

  return (
    <div>
      <div className="page-head">
        <h1>Catálogo</h1>
        <span className="pill n">{lista.length} produtos</span>
      </div>
      <p className="hint">Importado do TOTVS (código e descrição originais). Novos produtos são criados no TOTVS e reimportados. Preço vem da tabela de preços.</p>

      <div className="grid-form" style={{ marginBottom: 12 }}>
        <div className="field full" style={{ marginBottom: 0 }}>
          <label>Buscar (código, descrição ou NCM)</label>
          <input className="input" placeholder="ex.: canaleta, CAN0700 ou 3917.40.90" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Tipo</label>
          <select className="select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            {tipos.map(([t, n]) => <option key={t} value={t}>{tipoTotvsLabel(t)} ({n})</option>)}
          </select>
        </div>
      </div>

      <p className="hint">{filtrados.length} encontrado(s){filtrados.length > LIMITE ? ` · mostrando os primeiros ${LIMITE}` : ''}</p>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr>
            <th>Código</th><th>Descrição</th><th>Tipo</th><th>Un</th><th>NCM</th><th>CEST</th><th>Peso líq.</th><th>Origem</th><th>Gr.Trib</th>
          </tr></thead>
          <tbody>
            {filtrados.slice(0, LIMITE).map((p) => (
              <tr key={p.id} style={p.bloqueado || !p.ativo ? { opacity: 0.5 } : undefined}>
                <td style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{p.codigo_totvs}</td>
                <td>{p.descricao}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{tipoTotvsLabel(p.tipo_totvs)}</td>
                <td>{p.unidade}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{p.ncm || '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{p.cest || '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{p.peso_liquido_kg ? p.peso_liquido_kg + ' kg' : '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{p.origem_fiscal != null ? (ORIGEM[p.origem_fiscal] || p.origem_fiscal) : '—'}</td>
                <td>{p.grupo_tributario || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
