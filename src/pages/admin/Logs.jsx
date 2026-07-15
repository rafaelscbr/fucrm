import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Logs() {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    supabase.from('audit_log')
      .select('id,acao,entidade,entidade_id,created_at,user:profiles(nome)')
      .order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => setRows(data || []))
  }, [])
  if (rows === null) return <div className="spinner" />

  return (
    <div>
      <div className="page-head"><h1>Logs & auditoria</h1></div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Entidade</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleString('pt-BR')}</td>
                <td>{r.user?.nome || '—'}</td>
                <td>{r.acao}</td>
                <td>{r.entidade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <div className="empty">Sem registros ainda.</div>}
    </div>
  )
}
