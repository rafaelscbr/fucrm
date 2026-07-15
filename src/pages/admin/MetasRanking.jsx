import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { brl } from '../../lib/format'

const METRICAS = { faturamento: 'Faturamento', pedidos: 'Pedidos', visitas: 'Visitas', novos_clientes: 'Novos clientes' }
const UFS = ['SC', 'RS', 'PR', 'SP', 'MG', 'RJ']
const mesAtual = () => new Date().toISOString().slice(0, 7)
const fmt = (metrica, v) => (metrica === 'faturamento' ? brl(v) : String(Math.round(v)))
const FORM0 = { escopo: 'representante', alvo: '', metrica: 'faturamento', valor: '' }

export default function MetasRanking() {
  const [periodo, setPeriodo] = useState(mesAtual())
  const [ds, setDs] = useState(null)
  const [f, setF] = useState(FORM0)

  async function load() {
    const [metas, reps, orcs, inter] = await Promise.all([
      supabase.from('metas').select('*').order('created_at'),
      supabase.from('profiles').select('id,nome,papel'),
      supabase.from('orcamentos').select('status,valor_total,created_at,representante_id,cliente:clientes(estado)'),
      supabase.from('interacoes').select('representante_id,tipo,resumo,data,cliente:clientes(estado)'),
    ])
    setDs({ metas: metas.data || [], reps: (reps.data || []).filter((r) => r.papel === 'representante'), orcs: orcs.data || [], inter: inter.data || [] })
  }
  useEffect(() => { load() }, [])

  const calc = useMemo(() => {
    if (!ds) return null
    const { metas, reps, orcs, inter } = ds
    const inMes = (d) => (d || '').slice(0, 7) === periodo
    const realizado = (m) => {
      const escOrc = (o) => m.escopo === 'geral' ? true : m.escopo === 'representante' ? o.representante_id === m.alvo : o.cliente?.estado === m.alvo
      const escInt = (i) => m.escopo === 'geral' ? true : m.escopo === 'representante' ? i.representante_id === m.alvo : i.cliente?.estado === m.alvo
      if (m.metrica === 'faturamento') return orcs.filter((o) => o.status === 'faturado' && inMes(o.created_at) && escOrc(o)).reduce((s, o) => s + Number(o.valor_total || 0), 0)
      if (m.metrica === 'pedidos') return orcs.filter((o) => ['lancado_totvs', 'faturado'].includes(o.status) && inMes(o.created_at) && escOrc(o)).length
      if (m.metrica === 'visitas') return inter.filter((i) => i.tipo !== 'ocorrencia' && inMes(i.data) && escInt(i)).length
      if (m.metrica === 'novos_clientes') return inter.filter((i) => i.resumo === 'Tornou-se Cliente' && inMes(i.data) && escInt(i)).length
      return 0
    }
    const alvoLabel = (m) => m.escopo === 'geral' ? 'Time (geral)' : m.escopo === 'regiao' ? `Região ${m.alvo}` : (reps.find((r) => r.id === m.alvo)?.nome || 'Representante')

    const rank = reps.map((r) => {
      const fat = orcs.filter((o) => o.status === 'faturado' && inMes(o.created_at) && o.representante_id === r.id).reduce((s, o) => s + Number(o.valor_total || 0), 0)
      const metaFat = metas.find((m) => m.periodo === periodo && m.escopo === 'representante' && m.alvo === r.id && m.metrica === 'faturamento')?.valor || 0
      return { ...r, fat, metaFat, pct: metaFat ? Math.round(fat / metaFat * 100) : null }
    }).sort((a, b) => b.fat - a.fat)

    const metasPer = metas.filter((m) => m.periodo === periodo).map((m) => ({ ...m, real: realizado(m), label: alvoLabel(m) }))
    return { rank, metasPer }
  }, [ds, periodo])

  async function addMeta() {
    if (!f.valor || (f.escopo !== 'geral' && !f.alvo)) return
    await supabase.from('metas').insert({ periodo, escopo: f.escopo, alvo: f.escopo === 'geral' ? null : f.alvo, metrica: f.metrica, valor: Number(f.valor) })
    setF(FORM0); load()
  }
  async function delMeta(id) { await supabase.from('metas').delete().eq('id', id); load() }

  if (!calc) return <div className="spinner" />

  return (
    <div>
      <div className="page-head">
        <h1>Metas &amp; Ranking</h1>
        <input className="input" type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} style={{ width: 'auto' }} />
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h3>Ranking de faturamento</h3>
        {calc.rank.every((r) => r.fat === 0) ? <div className="muted" style={{ fontSize: 13 }}>Sem faturamento no período.</div> : (
          calc.rank.map((r, i) => (
            <div className="rank-row" key={r.id}>
              <span className={'rank-pos' + (i < 3 ? ' p' + (i + 1) : '')}>{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                <div className="rank-name">{r.nome}</div>
                {r.metaFat > 0 && <div className="meta-prog" style={{ margin: '4px 0 0' }}><span>meta {brl(r.metaFat)}</span><span>{r.pct}%</span></div>}
                {r.metaFat > 0 && <div className="meter" style={{ marginTop: 3 }}><i style={{ width: Math.min(r.pct, 100) + '%' }} /></div>}
              </div>
              <span className="rank-val">{brl(r.fat)}</span>
            </div>
          ))
        )}
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h3>Metas do período</h3>
        {calc.metasPer.length === 0 ? <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Nenhuma meta definida para {periodo}.</div> : (
          calc.metasPer.map((m) => {
            const pct = m.valor ? Math.round(m.real / m.valor * 100) : 0
            return (
              <div className="meta-row" key={m.id}>
                <div className="meta-top">
                  <div><span className="meta-lbl">{m.label}</span> <span className="meta-metrica">· {METRICAS[m.metrica]}</span></div>
                  <button className="btn danger sm" onClick={() => delMeta(m.id)}>remover</button>
                </div>
                <div className="meter"><i style={{ width: Math.min(pct, 100) + '%', background: pct >= 100 ? 'var(--accent)' : undefined }} /></div>
                <div className="meta-prog"><span>{fmt(m.metrica, m.real)} de {fmt(m.metrica, m.valor)}</span><b style={{ color: pct >= 100 ? 'var(--accent-text)' : 'var(--text)' }}>{pct}%</b></div>
              </div>
            )
          })
        )}
      </div>

      <div className="panel">
        <h3>Nova meta</h3>
        <div className="grid-form">
          <div className="field"><label>Escopo</label>
            <select className="select" value={f.escopo} onChange={(e) => setF({ ...f, escopo: e.target.value, alvo: '' })}>
              <option value="representante">Representante</option>
              <option value="regiao">Região (UF)</option>
              <option value="geral">Geral (time)</option>
            </select></div>
          {f.escopo === 'representante' && (
            <div className="field"><label>Representante</label>
              <select className="select" value={f.alvo} onChange={(e) => setF({ ...f, alvo: e.target.value })}>
                <option value="">Selecione…</option>
                {ds.reps.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select></div>
          )}
          {f.escopo === 'regiao' && (
            <div className="field"><label>UF</label>
              <select className="select" value={f.alvo} onChange={(e) => setF({ ...f, alvo: e.target.value })}>
                <option value="">Selecione…</option>
                {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select></div>
          )}
          <div className="field"><label>Métrica</label>
            <select className="select" value={f.metrica} onChange={(e) => setF({ ...f, metrica: e.target.value })}>
              {Object.entries(METRICAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div className="field"><label>Valor da meta</label>
            <input className="input" type="number" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} placeholder={f.metrica === 'faturamento' ? 'R$' : 'quantidade'} /></div>
        </div>
        <button className="btn" onClick={addMeta}>Adicionar meta em {periodo}</button>
      </div>
    </div>
  )
}
