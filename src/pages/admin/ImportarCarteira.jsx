import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'

export default function ImportarCarteira() {
  const { session } = useAuth()
  const [texto, setTexto] = useState('')
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)

  const linhas = texto.trim()
    ? texto.trim().split('\n').map((l) => l.split(',').map((s) => s.trim())).filter((c) => c[0])
    : []

  async function importar() {
    setBusy(true); setRes(null)
    const payload = linhas.map((c) => ({
      razao_social: c[0], cidade: c[1] || null, estado: (c[2] || '').toUpperCase() || null,
      cnpj_cpf: c[3] || null, created_by: session.user.id,
    }))
    const { data, error } = await supabase.from('clientes').insert(payload).select('id')
    setBusy(false)
    if (error) { setRes({ erro: error.message }); return }
    await logAudit('importar_carteira', 'cliente', null, { total: data.length })
    setRes({ ok: data.length }); setTexto('')
  }

  return (
    <div>
      <div className="page-head"><h1>Importar carteira</h1></div>
      <p className="hint">Uma linha por cliente, no formato: <b>razão social, cidade, UF, CNPJ</b></p>
      <div className="field">
        <label>Cole a planilha (CSV)</label>
        <textarea className="input" style={{ minHeight: 160 }} value={texto} onChange={(e) => setTexto(e.target.value)}
          placeholder={'Construtora Exemplo, Blumenau, SC, 12.345.678/0001-90\nMetalúrgica Modelo, Caxias do Sul, RS,'} />
      </div>
      {res?.ok != null && <div className="banner accent"><span>✓</span><span><b>{res.ok}</b> clientes importados.</span></div>}
      {res?.erro && <div className="err">{res.erro}</div>}
      <button className="btn block" onClick={importar} disabled={busy || linhas.length === 0}>
        {busy ? 'Importando…' : `Importar ${linhas.length} cliente(s)`}
      </button>
    </div>
  )
}
