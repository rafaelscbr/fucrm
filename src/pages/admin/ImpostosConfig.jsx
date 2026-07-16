import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'

const SUL = ['RS', 'SC', 'PR']

export default function ImpostosConfig() {
  const toast = useToast()
  const [linhas, setLinhas] = useState(null)
  const [salvando, setSalvando] = useState(null)

  async function load() {
    const { data } = await supabase.from('impostos_uf').select('*').order('uf')
    setLinhas(data || [])
  }
  useEffect(() => { load() }, [])

  const set = (uf, k, v) => setLinhas((arr) => arr.map((l) => (l.uf === uf ? { ...l, [k]: v } : l)))

  async function salvar(l) {
    setSalvando(l.uf)
    const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')))
    const { error } = await supabase.from('impostos_uf').update({
      aliq_interna: num(l.aliq_interna) ?? 0, aliq_inter: num(l.aliq_inter) ?? 0,
      difal_pp: num(l.difal_pp) ?? 0, mva_pp: num(l.mva_pp), aliq_st_pp: num(l.aliq_st_pp),
      atualizado_em: new Date().toISOString(),
    }).eq('uf', l.uf)
    setSalvando(null)
    if (error) toast('Não foi possível salvar ' + l.uf, 'erro')
    else { toast(l.uf + ' atualizado'); load() }
  }

  if (linhas === null) return <div className="spinner" />
  const semMva = linhas.filter((l) => l.mva_pp == null).length

  // Sul primeiro (área de atuação), depois o resto
  const ordenadas = [...linhas].sort((a, b) => (SUL.includes(b.uf) ? 1 : 0) - (SUL.includes(a.uf) ? 1 : 0) || a.uf.localeCompare(b.uf))

  return (
    <div>
      <div className="page-head">
        <h1>Impostos por estado</h1>
        {semMva > 0 && <span className="pill w">{semMva} UF sem MVA (ST pendente)</span>}
      </div>
      <p className="hint">
        Linha polipropileno (Fuplastic). Percentuais em % — DIFAL embute no preço p/ não contribuinte;
        MVA + alíq. ST calculam a substituição tributária p/ revendedor (sem MVA, o orçamento avisa e não soma ST).
        Fonte: planilha DIFAL Brasil + regras da TOTVS.
      </p>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr>
            <th>UF</th><th>Alíq. interna %</th><th>Interestadual %</th><th>DIFAL PP %</th><th>MVA ST %</th><th>Alíq. ST %</th><th></th>
          </tr></thead>
          <tbody>
            {ordenadas.map((l) => (
              <tr key={l.uf} style={SUL.includes(l.uf) ? { background: 'var(--accent-soft)' } : undefined}>
                <td style={{ fontWeight: 800 }}>{l.uf}</td>
                {['aliq_interna', 'aliq_inter', 'difal_pp', 'mva_pp', 'aliq_st_pp'].map((k) => (
                  <td key={k} style={{ minWidth: 84 }}>
                    <input className="input" style={{ padding: '7px 9px', fontSize: 13.5 }} inputMode="decimal"
                      value={l[k] ?? ''} placeholder={k === 'mva_pp' || k === 'aliq_st_pp' ? 'pendente' : '0'}
                      onChange={(e) => set(l.uf, k, e.target.value)} />
                  </td>
                ))}
                <td><button className="btn ghost sm" disabled={salvando === l.uf} onClick={() => salvar(l)}>{salvando === l.uf ? '…' : 'salvar'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
