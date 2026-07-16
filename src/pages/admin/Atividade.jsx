import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { brl, statusLabel, dataBR, dataHoraBR, tipoInteracaoLabel } from '../../lib/format'

const PERIODOS = [['7', '7 dias'], ['30', '30 dias'], ['90', '90 dias'], ['365', '12 meses'], ['all', 'Tudo']]
const ESTAGIO = { lead: 'Lead', tentativa: 'Tentativa', prospect: 'Prospect', cliente: 'Cliente', descartado: 'Descartado' }
const ST_PILL = { faturado: 'g', lancado_totvs: 'g', aguardando_totvs: 'w', perdido: 'r', cancelado: 'r' }

export default function Atividade() {
  const nav = useNavigate()
  const [tab, setTab] = useState('visitas')
  const [rep, setRep] = useState('')
  const [per, setPer] = useState('30')
  const [busca, setBusca] = useState('')
  const [d, setD] = useState(null)

  useEffect(() => {
    async function load() {
      const [reps, vis, orcs, clis] = await Promise.all([
        supabase.from('profiles').select('id,nome,papel'),
        supabase.from('interacoes')
          .select('id,data,tipo,resumo,proxima_acao,representante_id,cliente:clientes(id,razao_social,cidade,estado)')
          .order('data', { ascending: false }).limit(1500),
        supabase.from('orcamentos')
          .select('id,numero,status,valor_total,created_at,representante_id,cliente:clientes(id,razao_social,estado)')
          .order('created_at', { ascending: false }),
        supabase.from('clientes')
          .select('id,razao_social,cidade,estado,estagio,contato_nome,representante_responsavel_id')
          .order('razao_social'),
      ])
      setD({ reps: reps.data || [], vis: vis.data || [], orcs: orcs.data || [], clis: clis.data || [] })
    }
    load()
  }, [])

  const calc = useMemo(() => {
    if (!d) return null
    const cut = per === 'all' ? 0 : Date.now() - Number(per) * 86400000
    const t = busca.trim().toLowerCase()
    const okData = (x) => !cut || new Date(x).getTime() >= cut
    const ok = (s) => !t || (s || '').toLowerCase().includes(t)
    const visitas = d.vis.filter((v) => v.tipo !== 'ocorrencia'
      && (!rep || v.representante_id === rep) && okData(v.data)
      && (ok(v.cliente?.razao_social) || ok(v.resumo)))
    const orcs = d.orcs.filter((o) => (!rep || o.representante_id === rep) && okData(o.created_at)
      && (ok(o.cliente?.razao_social) || ok(String(o.numero))))
    const clis = d.clis.filter((c) => (!rep || c.representante_responsavel_id === rep)
      && (ok(c.razao_social) || ok(c.cidade) || ok(c.contato_nome)))
    return { visitas, orcs, clis, totalOrcs: orcs.reduce((s, o) => s + Number(o.valor_total || 0), 0) }
  }, [d, rep, per, busca])

  if (!calc) return <div className="spinner" />
  const reps = d.reps.filter((r) => r.papel === 'representante')
  const nome = (id) => d.reps.find((r) => r.id === id)?.nome?.split(' ')[0] || '—'

  return (
    <div>
      <div className="page-head">
        <h1>Atividade</h1>
        <span className="pill n">
          {tab === 'visitas' && `${calc.visitas.length} visita(s)`}
          {tab === 'orcamentos' && `${calc.orcs.length} orç. · ${brl(calc.totalOrcs)}`}
          {tab === 'clientes' && `${calc.clis.length} cliente(s)`}
        </span>
      </div>

      <div className="grid-form" style={{ marginBottom: 14 }}>
        <div className="field" style={{ marginBottom: 0 }}><label>Representante</label>
          <select className="select" value={rep} onChange={(e) => setRep(e.target.value)}>
            <option value="">Todos</option>
            {reps.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select></div>
        <div className="field" style={{ marginBottom: 0 }}><label>Período</label>
          <select className="select" value={per} onChange={(e) => setPer(e.target.value)}>
            {PERIODOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></div>
        <div className="field full" style={{ marginBottom: 0 }}><label>Buscar (cliente, resumo, nº)</label>
          <input className="input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="ex.: Blumenau, canaleta, 88…" /></div>
      </div>

      <div className="tabs">
        <button className={'tab ' + (tab === 'visitas' ? 'on' : '')} onClick={() => setTab('visitas')}>Visitas ({calc.visitas.length})</button>
        <button className={'tab ' + (tab === 'orcamentos' ? 'on' : '')} onClick={() => setTab('orcamentos')}>Orçamentos ({calc.orcs.length})</button>
        <button className={'tab ' + (tab === 'clientes' ? 'on' : '')} onClick={() => setTab('clientes')}>Clientes ({calc.clis.length})</button>
      </div>

      {tab === 'visitas' && (calc.visitas.length === 0 ? <div className="empty">Nenhuma visita no filtro.</div> : (
        calc.visitas.map((v) => (
          <button className="row" key={v.id} onClick={() => nav(`/clientes/${v.cliente?.id}`)}>
            <div className="grow">
              <div className="l1">{v.cliente?.razao_social || '—'} <span className="pill i" style={{ marginLeft: 6 }}>{tipoInteracaoLabel[v.tipo] || v.tipo}</span></div>
              <div className="l2">{(v.resumo || '').slice(0, 96)}{(v.resumo || '').length > 96 ? '…' : ''}</div>
            </div>
            <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{nome(v.representante_id)}</div>
              <div className="l2">{dataHoraBR(v.data)}</div>
            </div>
          </button>
        ))
      ))}

      {tab === 'orcamentos' && (calc.orcs.length === 0 ? <div className="empty">Nenhum orçamento no filtro.</div> : (
        calc.orcs.map((o) => (
          <button className="row" key={o.id} onClick={() => nav(`/orcamentos/${o.id}`)}>
            <div className="grow">
              <div className="l1">#{o.numero} · {o.cliente?.razao_social || '—'}</div>
              <div className="l2">{nome(o.representante_id)} · {dataBR(o.created_at)}{o.cliente?.estado ? ' · ' + o.cliente.estado : ''}</div>
            </div>
            <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
              <div style={{ fontWeight: 800 }}>{brl(o.valor_total)}</div>
              <span className={'pill ' + (ST_PILL[o.status] || 'n')} style={{ marginTop: 3 }}>{statusLabel[o.status] || o.status}</span>
            </div>
          </button>
        ))
      ))}

      {tab === 'clientes' && (calc.clis.length === 0 ? <div className="empty">Nenhum cliente no filtro.</div> : (
        calc.clis.map((c) => (
          <button className="row" key={c.id} onClick={() => nav(`/clientes/${c.id}`)}>
            <div className="grow">
              <div className="l1">{c.razao_social}</div>
              <div className="l2">{[c.contato_nome, [c.cidade, c.estado].filter(Boolean).join('/'), nome(c.representante_responsavel_id)].filter(Boolean).join(' · ')}</div>
            </div>
            <span className="pill n">{ESTAGIO[c.estagio] || c.estagio}</span>
          </button>
        ))
      ))}
    </div>
  )
}
