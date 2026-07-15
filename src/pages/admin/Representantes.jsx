import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Representantes() {
  const [reps, setReps] = useState(null)
  const [edit, setEdit] = useState(null)

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('nome')
    setReps(data || [])
  }
  useEffect(() => { load() }, [])

  async function salvar() {
    await supabase.from('profiles').update({
      papel: edit.papel, codigo_vendedor_totvs: edit.codigo_vendedor_totvs || null, ativo: edit.ativo,
    }).eq('id', edit.id)
    setEdit(null); load()
  }

  if (reps === null) return <div className="spinner" />

  return (
    <div>
      <div className="page-head"><h1>Representantes</h1></div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Nome</th><th>Papel</th><th>Cód. TOTVS</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {reps.map((r) => (
              <tr key={r.id}>
                <td>{r.nome}<div className="faint" style={{ fontSize: 12 }}>{r.email}</div></td>
                <td>{r.papel}</td>
                <td>{r.codigo_vendedor_totvs || '—'}</td>
                <td>{r.ativo ? <span className="pill g">ativo</span> : <span className="pill n">inativo</span>}</td>
                <td><button className="btn ghost sm" onClick={() => setEdit({ ...r })}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEdit(null)}>
          <div className="modal">
            <h3 style={{ marginBottom: 14 }}>{edit.nome}</h3>
            <div className="field"><label>Papel</label>
              <select className="select" value={edit.papel} onChange={(e) => setEdit({ ...edit, papel: e.target.value })}>
                <option value="representante">Representante</option>
                <option value="gestor">Gestor</option>
                <option value="admin">Admin</option></select></div>
            <div className="field"><label>Código de vendedor (TOTVS)</label>
              <input className="input" value={edit.codigo_vendedor_totvs || ''} onChange={(e) => setEdit({ ...edit, codigo_vendedor_totvs: e.target.value })} /></div>
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={edit.ativo} onChange={(e) => setEdit({ ...edit, ativo: e.target.checked })} />
              <span>Ativo</span></label>
            <div className="toolbar" style={{ marginTop: 8 }}>
              <button className="btn" onClick={salvar}>Salvar</button>
              <button className="btn ghost" onClick={() => setEdit(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
