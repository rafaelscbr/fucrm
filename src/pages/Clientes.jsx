import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Clientes() {
  const { session } = useAuth()
  const [clientes, setClientes] = useState(null)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    supabase
      .from('clientes')
      .select('id, razao_social, cidade, estado, tipo_cliente, bloqueado, representante_responsavel_id')
      .order('razao_social')
      .then(({ data }) => setClientes(data || []))
  }, [])

  if (clientes === null) return <div className="spinner" />

  const filtrados = clientes.filter((c) =>
    c.razao_social.toLowerCase().includes(busca.toLowerCase()) ||
    (c.cidade || '').toLowerCase().includes(busca.toLowerCase()),
  )

  return (
    <div>
      <div className="page-head">
        <h1>Clientes</h1>
        <button className="btn" disabled title="Em breve">+ Novo</button>
      </div>

      <input
        className="input"
        placeholder="Buscar por nome ou cidade…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {filtrados.length === 0 ? (
        <div className="empty">Nenhum cliente ainda. A importação da carteira entra em breve.</div>
      ) : (
        filtrados.map((c) => {
          const meu = c.representante_responsavel_id === session?.user?.id
          return (
            <div className="row" key={c.id}>
              <div className="grow">
                <div className="l1">{c.razao_social}</div>
                <div className="l2">
                  {[c.cidade, c.estado].filter(Boolean).join(' · ')}
                  {c.tipo_cliente ? ` · ${c.tipo_cliente.replace('_', ' ')}` : ''}
                </div>
              </div>
              {c.bloqueado ? (
                <span className="pill r">bloqueado</span>
              ) : meu ? (
                <span className="pill g">meu</span>
              ) : (
                <span className="pill w">outro rep</span>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
