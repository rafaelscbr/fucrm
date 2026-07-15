import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const CAMPOS = [
  ['fantasia', 'Nome fantasia'], ['nome', 'Razão social'], ['cnpj', 'CNPJ'],
  ['ie', 'Inscrição estadual'], ['endereco', 'Endereço'], ['telefone', 'Telefone'],
  ['email', 'E-mail'], ['site', 'Site'], ['filial', 'Filial (TOTVS)'],
]

export default function DadosEmpresa() {
  const [f, setF] = useState(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('empresa_config').select('*').eq('id', 1).single().then(({ data }) => setF(data || { id: 1 }))
  }, [])

  if (!f) return <div className="spinner" />
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setSaved(false) }

  async function salvar() {
    setSaving(true)
    const { id, updated_at, ...rest } = f
    await supabase.from('empresa_config').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', 1)
    setSaving(false); setSaved(true)
  }

  return (
    <div>
      <div className="page-head"><h1>Dados da Fuplastic</h1></div>
      <p className="hint">Estes dados aparecem no PDF do orçamento (cabeçalho e bloco do fornecedor).</p>
      <div className="card">
        <div className="grid-form">
          {CAMPOS.map(([k, label]) => (
            <div className="field" key={k}>
              <label>{label}</label>
              <input className="input" value={f[k] || ''} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
        </div>
        {saved && <div className="banner accent"><span>✓</span><span>Dados salvos.</span></div>}
        <button className="btn" onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </div>
  )
}
