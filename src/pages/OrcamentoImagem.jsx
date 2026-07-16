import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toPng, toBlob } from 'html-to-image'
import { supabase } from '../lib/supabase'
import { brl, dataBR } from '../lib/format'
import { EMPRESA } from '../lib/empresa'
import { useToast } from '../context/ToastContext'

export default function OrcamentoImagem() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const cardRef = useRef(null)
  const [o, setO] = useState(null)
  const [cli, setCli] = useState(null)
  const [itens, setItens] = useState([])
  const [rep, setRep] = useState(null)
  const [empresa, setEmpresa] = useState(EMPRESA)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('empresa_config').select('*').eq('id', 1).single().then(({ data }) => { if (data) setEmpresa({ ...EMPRESA, ...data }) })
    ;(async () => {
      const { data: orc } = await supabase.from('orcamentos').select('*, endereco:enderecos(*)').eq('id', id).single()
      setO(orc)
      if (orc) {
        const [{ data: c }, { data: it }, { data: r }] = await Promise.all([
          supabase.from('clientes').select('*').eq('id', orc.cliente_id).single(),
          supabase.from('orcamento_itens').select('*').eq('orcamento_id', id),
          orc.representante_id ? supabase.from('profiles').select('nome,codigo_vendedor_totvs').eq('id', orc.representante_id).single() : Promise.resolve({ data: null }),
        ])
        setCli(c); setItens(it || []); setRep(r)
      }
    })()
  }, [id])

  async function gerarBlob() {
    return toBlob(cardRef.current, { pixelRatio: 2.5, backgroundColor: '#ffffff', cacheBust: true })
  }
  async function baixar() {
    setBusy(true)
    try {
      const url = await toPng(cardRef.current, { pixelRatio: 2.5, backgroundColor: '#ffffff', cacheBust: true })
      const a = document.createElement('a'); a.href = url; a.download = `orcamento-${o.numero}.png`; a.click()
      toast('Imagem baixada')
    } catch { toast('Não foi possível gerar a imagem', 'erro') }
    setBusy(false)
  }
  async function compartilhar() {
    setBusy(true)
    try {
      const blob = await gerarBlob()
      const file = new File([blob], `orcamento-${o.numero}.png`, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Orçamento #${o.numero}`, text: `Segue o orçamento #${o.numero} — Fuplastic` })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `orcamento-${o.numero}.png`; a.click()
        toast('Compartilhar não suportado aqui — imagem baixada')
      }
    } catch { /* cancelado */ }
    setBusy(false)
  }

  if (!o || !cli) return <div className="spinner" />

  return (
    <div>
      <button className="back" onClick={() => nav(-1)}>‹ Voltar</button>
      <div className="page-head"><h1>Imagem do orçamento</h1></div>
      <div className="toolbar">
        <button className="btn" onClick={compartilhar} disabled={busy}>{busy ? 'Gerando…' : 'Enviar no WhatsApp'}</button>
        <button className="btn ghost" onClick={baixar} disabled={busy}>Baixar imagem</button>
      </div>
      <p className="hint">“Enviar no WhatsApp” abre o compartilhamento do celular com a imagem pronta para mandar ao cliente.</p>

      <div className="orc-img-wrap">
        <div className="orc-img" ref={cardRef}>
          <div className="oi-head">
            <div className="oi-logo">FUPLASTIC</div>
            <div className="oi-tag">Proposta Comercial</div>
            <div className="oi-num">Orçamento Nº {o.numero} · {dataBR(o.created_at)}</div>
          </div>
          <div className="oi-body">
            <div className="oi-block">
              <div className="oi-lbl">Cliente</div>
              <div className="oi-cli">{cli.razao_social}</div>
              <div className="oi-meta">{[cli.cidade, cli.estado].filter(Boolean).join('/')}{cli.cnpj_cpf ? ` · ${cli.cnpj_cpf}` : ''}</div>
            </div>
            <div className="oi-items">
              {itens.map((i) => (
                <div className="oi-item" key={i.id}>
                  <div className="oi-it-l">
                    <div className="oi-desc">{i.descricao || i.codigo_inteligente}</div>
                    <div className="oi-cod">{i.codigo_inteligente} · {i.quantidade} un × {brl(i.valor_unitario)}</div>
                  </div>
                  <div className="oi-it-v">{brl(i.subtotal)}</div>
                </div>
              ))}
            </div>
            <div className="oi-cond">
              <div><span>Pagamento</span><b>{o.condicao_pagamento || '—'}</b></div>
              <div><span>Frete</span><b>{o.tipo_frete === 'F' ? 'FOB' : o.tipo_frete}{o.tipo_frete === 'CIF' && o.valor_frete ? ` · ${brl(o.valor_frete)}` : ''}</b></div>
              {o.endereco && <div><span>Entrega</span><b>{[o.endereco.apelido, o.endereco.cidade].filter(Boolean).join(' · ')}</b></div>}
            </div>
            {o.fiscal && (o.fiscal.tot_st > 0 || o.fiscal.tot_difal > 0 || o.fiscal.tot_ipi > 0) && (
              <div className="oi-cond">
                {o.fiscal.tot_ipi > 0 && <div><span>IPI</span><b>{brl(o.fiscal.tot_ipi)}</b></div>}
                {o.fiscal.tot_st > 0 && <div><span>ICMS-ST</span><b>{brl(o.fiscal.tot_st)}</b></div>}
                {o.fiscal.tot_difal > 0 && <div><span>DIFAL {o.fiscal.difal_pp}%</span><b>{brl(o.fiscal.tot_difal)}</b></div>}
              </div>
            )}
            <div className="oi-total"><span>Valor total</span><b>{brl(o.valor_total)}</b></div>
            {o.fiscal?.icms_destaque_pct > 0 && <div style={{ fontSize: 10, color: '#6b6d64', padding: '4px 2px 0' }}>ICMS {o.fiscal.icms_destaque_pct}% incluso no preço · valores conforme característica fiscal informada</div>}
          </div>
          <div className="oi-foot">
            <div className="oi-foot-rep">{rep?.nome || ''}{rep?.codigo_vendedor_totvs ? ` · cód. ${rep.codigo_vendedor_totvs}` : ''}</div>
            <div className="oi-foot-emp">{[empresa.telefone, empresa.email].filter(Boolean).join(' · ')}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
