import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { matchProduto, tipoTotvsLabel } from '../lib/produtos'
import { brl } from '../lib/format'
import { logAudit } from '../lib/audit'
import MoneyInput from '../components/MoneyInput'

export default function OrcamentoEditor() {
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const clienteId = sp.get('cliente')
  const { session, profile } = useAuth()
  const toast = useToast()

  const [cliente, setCliente] = useState(null)
  const [produtos, setProdutos] = useState([])
  const [busca, setBusca] = useState('')
  const [itens, setItens] = useState([])
  const [cond, setCond] = useState('')
  const [condicoes, setCondicoes] = useState([])
  const [frete, setFrete] = useState('FOB')
  const [valorFrete, setValorFrete] = useState('')
  const [peso, setPeso] = useState('')
  const [enderecos, setEnderecos] = useState([])
  const [entregaId, setEntregaId] = useState('')
  const [obsPedido, setObsPedido] = useState('')
  const [obsNF, setObsNF] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (clienteId) supabase.from('clientes').select('id,razao_social,estado,tipo_cliente').eq('id', clienteId).single().then(({ data }) => setCliente(data))
    supabase.from('produtos')
      .select('id,codigo_totvs,descricao,tipo_totvs,unidade,ncm,peso_liquido_kg')
      .eq('ativo', true).eq('bloqueado', false)
      .then(({ data }) => setProdutos(data || []))
    supabase.from('condicoes_pagamento').select('*').eq('ativo', true).order('ordem').then(({ data }) => setCondicoes(data || []))
    if (clienteId) supabase.from('enderecos').select('*').eq('cliente_id', clienteId).order('created_at').then(({ data }) => {
      setEnderecos(data || [])
      const p = (data || []).find((e) => e.principal)
      if (p) setEntregaId(p.id)
    })
  }, [clienteId])

  const achados = useMemo(() => (busca.length < 2 ? [] : produtos.filter((p) => matchProduto(p, busca)).slice(0, 8)), [busca, produtos])
  const total = itens.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0) + (Number(valorFrete) || 0)

  function addProduto(p) {
    setItens((arr) => [...arr, { produto_id: p.id, codigo_inteligente: p.codigo_totvs, descricao: p.descricao, quantidade: 1, valor_unitario: 0 }])
    setBusca('')
  }
  const upItem = (idx, k, v) => setItens((arr) => arr.map((it, i) => (i === idx ? { ...it, [k]: v } : it)))
  const rmItem = (idx) => setItens((arr) => arr.filter((_, i) => i !== idx))

  async function salvar() {
    if (!clienteId || itens.length === 0) return
    setSaving(true)
    const { data: orc, error } = await supabase.from('orcamentos').insert({
      cliente_id: clienteId, representante_id: session.user.id, status: 'rascunho',
      condicao_pagamento: cond || null, tipo_frete: frete,
      valor_frete: frete === 'CIF' ? Number(valorFrete) || 0 : null,
      peso_bruto_total: frete === 'CIF' ? Number(peso) || null : null,
      obs_pedido: obsPedido || null, obs_nota_fiscal: obsNF || null,
      endereco_entrega_id: entregaId || null,
      codigo_vendedor: profile?.codigo_vendedor_totvs || null,
    }).select('id').single()
    if (error) { setSaving(false); alert('Erro: ' + error.message); return }
    const payload = itens.map((i) => ({
      orcamento_id: orc.id, produto_id: i.produto_id, codigo_inteligente: i.codigo_inteligente,
      descricao: i.descricao, quantidade: Number(i.quantidade) || 1, valor_unitario: Number(i.valor_unitario) || 0,
    }))
    await supabase.from('orcamento_itens').insert(payload)
    await logAudit('criar', 'orcamento', orc.id)
    setSaving(false)
    toast('Orçamento salvo')
    nav(`/orcamentos/${orc.id}`)
  }

  return (
    <div>
      <button className="back" onClick={() => nav(-1)}>‹ Voltar</button>
      <div className="page-head"><h1>Novo orçamento</h1></div>

      {cliente && (
        <div className="banner warn"><span>⚠</span><span>
          <b>{cliente.razao_social}</b> · Estado <b>{cliente.estado}</b> · {cliente.tipo_cliente?.replace('_', ' ')} — definem a tributação no TOTVS
        </span></div>
      )}

      <div className="field">
        <label>Buscar produto (código TOTVS, descrição ou NCM)</label>
        <input className="input" placeholder="ex.: canaleta, CAN0700 ou 3917.40.90" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {achados.map((p) => (
        <button className="row" key={p.id} onClick={() => addProduto(p)}>
          <div className="grow"><div className="l1">{p.descricao}</div><div className="l2">{tipoTotvsLabel(p.tipo_totvs)} · {p.unidade}{p.ncm ? ' · NCM ' + p.ncm : ''}</div></div>
          <span className="pill i">{p.codigo_totvs}</span>
        </button>
      ))}

      {itens.length > 0 && <label className="field" style={{ marginTop: 8, marginBottom: 4 }}><span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--faint)' }}>Itens</span></label>}
      {itens.map((it, idx) => (
        <div className="card" key={idx} style={{ marginBottom: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{it.descricao}</div><div className="pill i" style={{ marginTop: 3 }}>{it.codigo_inteligente}</div></div>
            <button className="btn danger sm" onClick={() => rmItem(idx)}>remover</button>
          </div>
          <div className="grid-form">
            <div className="field" style={{ marginBottom: 8 }}><label>Quantidade</label>
              <input className="input" type="number" min="1" value={it.quantidade} onChange={(e) => upItem(idx, 'quantidade', e.target.value)} /></div>
            <div className="field" style={{ marginBottom: 8 }}><label>Valor unitário</label>
              <MoneyInput value={it.valor_unitario} onChange={(v) => upItem(idx, 'valor_unitario', v)} /></div>
          </div>
          <div className="faint" style={{ fontSize: 13, textAlign: 'right' }}>Subtotal: {brl(it.quantidade * it.valor_unitario)}</div>
        </div>
      ))}
      <p className="hint">Preço digitado manualmente — a tabela de preços do TOTVS será importada em breve.</p>

      <div className="grid-form">
        <div className="field"><label>Condição de pagamento</label>
          <select className="select" value={cond} onChange={(e) => setCond(e.target.value)}>
            <option value="">Selecione…</option>
            {condicoes.map((c) => { const v = (c.codigo ? c.codigo + ' · ' : '') + c.descricao; return <option key={c.id} value={v}>{v}</option> })}
          </select></div>
        <div className="field"><label>Tipo de frete</label>
          <select className="select" value={frete} onChange={(e) => setFrete(e.target.value)}>
            <option value="FOB">FOB</option><option value="CIF">CIF</option></select></div>
        <div className="field full"><label>Endereço de entrega</label>
          <select className="select" value={entregaId} onChange={(e) => setEntregaId(e.target.value)}>
            <option value="">Mesmo do faturamento</option>
            {enderecos.map((en) => <option key={en.id} value={en.id}>{[en.apelido, en.cidade].filter(Boolean).join(' — ') || en.logradouro || 'Endereço'}</option>)}
          </select>
          {enderecos.length === 0 && <p className="hint" style={{ marginTop: 5 }}>Cadastre endereços na ficha do cliente (aba Endereços).</p>}
        </div>
        {frete === 'CIF' && <>
          <div className="field"><label>Valor do frete</label>
            <MoneyInput value={valorFrete} onChange={setValorFrete} /></div>
          <div className="field"><label>Peso bruto total (kg)</label>
            <input className="input" type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} /></div>
        </>}
        <div className="field full"><label>Observação do pedido (interno)</label>
          <input className="input" value={obsPedido} onChange={(e) => setObsPedido(e.target.value)} /></div>
        <div className="field full"><label>Observação da nota fiscal (isenção/portaria)</label>
          <input className="input" value={obsNF} onChange={(e) => setObsNF(e.target.value)} /></div>
      </div>

      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span className="muted">Total</span><span style={{ fontSize: 20, fontWeight: 800 }}>{brl(total)}</span>
      </div>

      <button className="btn block" onClick={salvar} disabled={saving || itens.length === 0 || !clienteId}>
        {saving ? 'Salvando…' : 'Salvar orçamento'}
      </button>
    </div>
  )
}
