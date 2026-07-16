import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { matchProduto, tipoTotvsLabel } from '../lib/produtos'
import { regraFiscal, impostoUnit, ipiUnit, resumoFiscal } from '../lib/fiscal'
import { brl } from '../lib/format'
import { logAudit } from '../lib/audit'
import MoneyInput from '../components/MoneyInput'

const DRAFT_TTL = 72 * 3600 * 1000 // rascunho vive 72h
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))

export default function OrcamentoEditor() {
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const clienteId = sp.get('cliente')
  const { session, profile } = useAuth()
  const toast = useToast()

  const [cliente, setCliente] = useState(null)
  const [produtos, setProdutos] = useState([])
  const [precos, setPrecos] = useState({})
  const [imp, setImp] = useState(null)
  const [contrib, setContrib] = useState('') // '' = não confirmado | 'sim' | 'nao'
  const [busca, setBusca] = useState('')
  const [itens, setItens] = useState([])
  const [cond, setCond] = useState('')
  const [condicoes, setCondicoes] = useState([])
  const [frete, setFrete] = useState('FOB')
  const [valorFrete, setValorFrete] = useState('')
  const [peso, setPeso] = useState('')
  const [pesoEditado, setPesoEditado] = useState(false)
  const [enderecos, setEnderecos] = useState([])
  const [entregaId, setEntregaId] = useState('')
  const [obsPedido, setObsPedido] = useState('')
  const [obsNF, setObsNF] = useState('')
  const [saving, setSaving] = useState(false)
  const [flashId, setFlashId] = useState(null)
  const [focusId, setFocusId] = useState(null)
  const restaurado = useRef(false)
  const draftKey = clienteId ? `fucrm-orc-draft-${clienteId}` : null

  useEffect(() => {
    if (clienteId) supabase.from('clientes').select('id,razao_social,estado,tipo_cliente,contribuinte_icms').eq('id', clienteId).single().then(({ data }) => {
      setCliente(data)
      if (data?.contribuinte_icms === true) setContrib((c) => c || 'sim')
      if (data?.contribuinte_icms === false) setContrib((c) => c || 'nao')
      if (data?.estado) supabase.from('impostos_uf').select('*').eq('uf', data.estado).single().then(({ data: i }) => setImp(i))
    })
    supabase.from('produtos')
      .select('id,codigo_totvs,descricao,tipo_totvs,unidade,ncm,peso_liquido_kg,aliq_ipi')
      .eq('ativo', true).eq('bloqueado', false)
      .then(({ data }) => setProdutos(data || []))
    supabase.from('tabela_precos').select('produto_id,regiao_estado,preco').then(({ data }) => {
      const m = {}
      for (const r of data || []) { (m[r.produto_id] = m[r.produto_id] || {})[r.regiao_estado] = Number(r.preco) }
      setPrecos(m)
    })
    supabase.from('condicoes_pagamento').select('*').eq('ativo', true).order('ordem').then(({ data }) => setCondicoes(data || []))
    if (clienteId) supabase.from('enderecos').select('*').eq('cliente_id', clienteId).order('created_at').then(({ data }) => {
      setEnderecos(data || [])
      const p = (data || []).find((e) => e.principal)
      if (p) setEntregaId((cur) => cur || p.id) // não sobrescreve rascunho restaurado
    })
  }, [clienteId])

  // Rascunho automático: restaura ao abrir (se houver, até 72h)
  useEffect(() => {
    if (!draftKey || restaurado.current) return
    restaurado.current = true
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const d = JSON.parse(raw)
      if (Date.now() - (d.ts || 0) > DRAFT_TTL) { localStorage.removeItem(draftKey); return }
      if (!d.itens?.length && !d.obsPedido && !d.obsNF) return
      setItens(d.itens || []); setCond(d.cond || ''); setFrete(d.frete || 'FOB')
      setValorFrete(d.valorFrete || ''); setPeso(d.peso || ''); setPesoEditado(!!d.pesoEditado)
      setObsPedido(d.obsPedido || ''); setObsNF(d.obsNF || '')
      if (d.entregaId) setEntregaId(d.entregaId)
      if (d.contrib) setContrib(d.contrib)
      toast('Rascunho recuperado')
    } catch { /* rascunho corrompido: ignora */ }
  }, [draftKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rascunho automático: persiste a cada mudança
  useEffect(() => {
    if (!draftKey || !restaurado.current) return
    if (itens.length === 0 && !obsPedido && !obsNF && !cond) { localStorage.removeItem(draftKey); return }
    localStorage.setItem(draftKey, JSON.stringify({ ts: Date.now(), itens, cond, frete, valorFrete, peso, pesoEditado, entregaId, obsPedido, obsNF, contrib }))
  }, [draftKey, itens, cond, frete, valorFrete, peso, pesoEditado, entregaId, obsPedido, obsNF, contrib])

  const achados = useMemo(() => (busca.length < 2 ? [] : produtos.filter((p) => matchProduto(p, busca)).slice(0, 8)), [busca, produtos])

  // Regra fiscal do orçamento (contribuinte confirmado pelo rep no banner)
  const regra = useMemo(() => regraFiscal(cliente, contrib === '' ? null : contrib === 'sim'), [cliente, contrib])
  const resumo = useMemo(() => resumoFiscal(itens, regra, imp, frete === 'CIF' ? Number(valorFrete) || 0 : 0), [itens, regra, imp, frete, valorFrete])
  const fiscalPendente = !regra.exportacao && contrib === ''

  // Peso do frete calculado a partir do peso dos produtos (editável)
  const pesoAuto = useMemo(() => {
    const t = itens.reduce((s, i) => s + (i.peso_kg ? i.peso_kg * (Number(i.quantidade) || 0) : 0), 0)
    return Math.round(t * 10) / 10
  }, [itens])
  const pesoEfetivo = pesoEditado ? peso : (pesoAuto || '')

  function addProduto(p) {
    const existente = itens.find((i) => i.produto_id === p.id)
    if (existente) {
      setItens((arr) => arr.map((i) => (i.uid === existente.uid ? { ...i, quantidade: (Number(i.quantidade) || 0) + 1 } : i)))
      setFlashId(existente.uid)
      setTimeout(() => setFlashId(null), 900)
    } else {
      const tab = precos[p.id]?.SUL ?? precos[p.id]?.BR ?? 0
      const novo = {
        uid: uid(), produto_id: p.id, codigo_inteligente: p.codigo_totvs, descricao: p.descricao,
        unidade: p.unidade, peso_kg: p.peso_liquido_kg ? Number(p.peso_liquido_kg) : null,
        aliq_ipi: p.aliq_ipi ? Number(p.aliq_ipi) : 0, preco_tabela: tab,
        quantidade: 1, valor_unitario: tab,
      }
      setItens((arr) => [...arr, novo])
      setFocusId(novo.uid)
    }
    setBusca('')
  }
  const upItem = (u, k, v) => setItens((arr) => arr.map((it) => (it.uid === u ? { ...it, [k]: v } : it)))
  const rmItem = (u) => setItens((arr) => arr.filter((it) => it.uid !== u))
  const qtd = (u, delta) => setItens((arr) => arr.map((it) => (it.uid === u ? { ...it, quantidade: Math.max(1, (Number(it.quantidade) || 1) + delta) } : it)))

  async function salvar() {
    if (!clienteId || itens.length === 0 || fiscalPendente) return
    setSaving(true)
    const contribBool = contrib === '' ? null : contrib === 'sim'
    const fiscal = {
      uf: cliente?.estado || null, contribuinte: contribBool, revenda: regra.revenda, exportacao: regra.exportacao,
      aliq_interna: imp ? Number(imp.aliq_interna) : null, aliq_inter: imp ? Number(imp.aliq_inter) : null,
      difal_pp: imp ? Number(imp.difal_pp) : null, mva_pp: imp?.mva_pp != null ? Number(imp.mva_pp) : null,
      aliq_st_pp: imp?.aliq_st_pp != null ? Number(imp.aliq_st_pp) : null,
      tot_st: resumo.st, tot_difal: resumo.difal, tot_ipi: resumo.ipi,
      difal_info: resumo.difalInfo, icms_destaque_pct: resumo.icmsDestaquePct, st_pendente: resumo.stPendente,
    }
    const { data: orc, error } = await supabase.from('orcamentos').insert({
      cliente_id: clienteId, representante_id: session.user.id, status: 'rascunho',
      condicao_pagamento: cond || null, tipo_frete: frete,
      valor_frete: frete === 'CIF' ? Number(valorFrete) || 0 : null,
      peso_bruto_total: frete === 'CIF' ? Number(pesoEfetivo) || null : null,
      obs_pedido: obsPedido || null, obs_nota_fiscal: obsNF || null,
      endereco_entrega_id: entregaId || null,
      codigo_vendedor: profile?.codigo_vendedor_totvs || null,
      fiscal,
    }).select('id').single()
    if (error) { setSaving(false); alert('Erro: ' + error.message); return }
    const payload = itens.map((i) => {
      const p = Number(i.valor_unitario) || 0
      return {
        orcamento_id: orc.id, produto_id: i.produto_id, codigo_inteligente: i.codigo_inteligente,
        descricao: i.descricao, quantidade: Number(i.quantidade) || 1, valor_unitario: p,
        imposto_unit: impostoUnit(p, regra, imp).valor, ipi_unit: regra.exportacao ? 0 : ipiUnit(p, i.aliq_ipi),
      }
    })
    await supabase.from('orcamento_itens').insert(payload)
    // atualiza a característica fiscal no cadastro se o rep confirmou algo diferente
    if (contribBool !== null && contribBool !== cliente?.contribuinte_icms) {
      supabase.from('clientes').update({ contribuinte_icms: contribBool }).eq('id', clienteId).then(() => {})
    }
    await logAudit('criar', 'orcamento', orc.id)
    if (draftKey) localStorage.removeItem(draftKey)
    setSaving(false)
    toast('Orçamento salvo')
    nav(`/orcamentos/${orc.id}`)
  }

  return (
    <div>
      <button className="back" onClick={() => nav(-1)}>‹ Voltar</button>
      <div className="page-head"><h1>Novo orçamento</h1></div>

      {cliente && (
        <div className="fiscal-box">
          <div className="fb-top">
            <b>{cliente.razao_social}</b>
            <span className="pill n">{cliente.estado || 'UF?'}</span>
            {regra.exportacao ? <span className="pill g">Exportação · sem impostos</span>
              : regra.revenda ? <span className="pill w">Revenda → calcula ST</span>
                : <span className="pill i">Uso final</span>}
          </div>
          {!regra.exportacao && (
            <div className="fb-row">
              <label>Contribuinte de ICMS?</label>
              <select className="select" value={contrib} onChange={(e) => setContrib(e.target.value)} style={{ width: 'auto', minWidth: 170 }}>
                <option value="">— confirmar —</option>
                <option value="sim">Sim, contribuinte</option>
                <option value="nao">Não contribuinte</option>
              </select>
              {contrib === 'nao' && imp && Number(imp.difal_pp) > 0 && <span className="pill w">DIFAL {Number(imp.difal_pp)}% embutido</span>}
              {contrib === 'nao' && imp && Number(imp.difal_pp) === 0 && <span className="pill g">DIFAL 0% em {imp.uf}</span>}
              {contrib === 'sim' && !regra.revenda && <span className="pill g">preço de tabela</span>}
            </div>
          )}
          {fiscalPendente && <div className="fb-alert">Confirme a característica fiscal com o cliente antes de cotar — isso define o preço.</div>}
          {regra.revenda && imp && imp.mva_pp == null && (
            <div className="fb-alert">ST ainda não parametrizado para {imp.uf} (falta MVA) — o total sairá SEM ST. Avise o gestor.</div>
          )}
        </div>
      )}

      <h3 className="sec-h">1 · Produtos</h3>
      <div className="field">
        <label>Buscar produto (código TOTVS, descrição ou NCM)</label>
        <input className="input" placeholder="ex.: canaleta, CAN0700 ou 3917.40.90" value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && achados[0]) { e.preventDefault(); addProduto(achados[0]) } }} />
      </div>
      {achados.map((p) => (
        <button className="row" key={p.id} onClick={() => addProduto(p)}>
          <div className="grow"><div className="l1">{p.descricao}</div><div className="l2">{tipoTotvsLabel(p.tipo_totvs)} · {p.unidade}{p.ncm ? ' · NCM ' + p.ncm : ''}</div></div>
          <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
            {(precos[p.id]?.SUL ?? precos[p.id]?.BR) != null && <div style={{ fontWeight: 800, fontSize: 13.5 }}>{brl(precos[p.id]?.SUL ?? precos[p.id]?.BR)}</div>}
            <span className="pill i">{p.codigo_totvs}</span>
          </div>
        </button>
      ))}
      {busca.length >= 2 && achados.length === 0 && (
        <div className="empty">Nenhum produto encontrado para “{busca}”. Tente parte do código ou outra palavra da descrição.</div>
      )}
      {itens.length === 0 && busca.length < 2 && (
        <p className="hint">Busque e toque no produto para adicionar. Enter adiciona o primeiro resultado.</p>
      )}

      {itens.map((it) => {
        const p = Number(it.valor_unitario) || 0
        const q = Number(it.quantidade) || 0
        const im = impostoUnit(p, regra, imp)
        const ipi = regra.exportacao ? 0 : ipiUnit(p, it.aliq_ipi)
        const totLinha = (p + im.valor + ipi) * q
        return (
          <div className={'card' + (flashId === it.uid ? ' item-flash' : '')} key={it.uid} style={{ marginBottom: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{it.descricao}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                  <span className="pill i">{it.codigo_inteligente}</span>
                  {it.unidade && <span className="pill n">{it.unidade}</span>}
                  {it.preco_tabela > 0 && Math.abs(p - it.preco_tabela) > 0.005 && <span className="pill w">tabela {brl(it.preco_tabela)}</span>}
                </div>
              </div>
              <button className="btn danger sm" onClick={() => rmItem(it.uid)}>remover</button>
            </div>
            <div className="grid-form">
              <div className="field" style={{ marginBottom: 8 }}><label>Quantidade{it.unidade ? ` (${it.unidade})` : ''}</label>
                <div className="qty-ctl">
                  <button type="button" onClick={() => qtd(it.uid, -1)} aria-label="Diminuir">−</button>
                  <input type="number" min="1" value={it.quantidade} onChange={(e) => upItem(it.uid, 'quantidade', e.target.value)} />
                  <button type="button" onClick={() => qtd(it.uid, 1)} aria-label="Aumentar">+</button>
                </div>
              </div>
              <div className="field" style={{ marginBottom: 8 }}><label>Valor unitário (tabela)</label>
                <MoneyInput value={it.valor_unitario} onChange={(v) => upItem(it.uid, 'valor_unitario', v)} autoFocus={focusId === it.uid} /></div>
            </div>
            <div className="item-fisc">
              {im.tipo === 'st' && <span>+ ST {brl(im.valor)}/un → <b>{brl(p + im.valor)}/un com ST</b></span>}
              {im.tipo === 'difal' && <span>+ DIFAL {brl(im.valor)}/un → <b>{brl(p + im.valor)}/un final</b></span>}
              {im.tipo === 'st_pendente' && <span className="fisc-warn">ST pendente (sem MVA p/ {imp?.uf})</span>}
              {ipi > 0 && <span>+ IPI {it.aliq_ipi}% ({brl(ipi)}/un)</span>}
              <span style={{ marginLeft: 'auto' }}>Subtotal: <b>{brl(totLinha)}</b></span>
            </div>
          </div>
        )
      })}

      <h3 className="sec-h">2 · Pagamento e entrega</h3>
      <div className="grid-form">
        <div className="field"><label>Condição de pagamento</label>
          <select className="select" value={cond} onChange={(e) => setCond(e.target.value)}>
            <option value="">Selecione…</option>
            {condicoes.map((c) => { const v = (c.codigo ? c.codigo + ' · ' : '') + c.descricao; return <option key={c.id} value={v}>{v}</option> })}
          </select></div>
        <div className="field"><label>Tipo de frete</label>
          <select className="select" value={frete} onChange={(e) => setFrete(e.target.value)}>
            <option value="FOB">FOB · cliente retira (padrão)</option><option value="CIF">CIF · entrega negociada</option></select></div>
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
          <div className="field"><label>Peso total (kg)</label>
            <input className="input" type="number" step="0.1" value={pesoEfetivo}
              onChange={(e) => { setPeso(e.target.value); setPesoEditado(true) }} />
            {!pesoEditado && pesoAuto > 0 && <p className="hint" style={{ marginTop: 5 }}>Calculado pelo peso dos produtos ({pesoAuto} kg) — pode ajustar.</p>}
            {pesoEditado && pesoAuto > 0 && (
              <button type="button" className="btn ghost sm" style={{ marginTop: 6 }}
                onClick={() => { setPesoEditado(false); setPeso('') }}>Usar cálculo automático ({pesoAuto} kg)</button>
            )}
          </div>
        </>}
      </div>

      <h3 className="sec-h">3 · Observações</h3>
      <div className="grid-form">
        <div className="field full"><label>Observação do pedido (interno)</label>
          <input className="input" value={obsPedido} onChange={(e) => setObsPedido(e.target.value)} /></div>
        <div className="field full"><label>Observação da nota fiscal (isenção/portaria)</label>
          <input className="input" value={obsNF} onChange={(e) => setObsNF(e.target.value)} /></div>
      </div>

      {itens.length > 0 && (
        <div className="fisc-resumo">
          <div><span>Mercadoria</span><span>{brl(resumo.mercadoria)}</span></div>
          {resumo.ipi > 0 && <div><span>IPI</span><span>{brl(resumo.ipi)}</span></div>}
          {resumo.st > 0 && <div><span>ICMS-ST (revenda)</span><span>{brl(resumo.st)}</span></div>}
          {resumo.difal > 0 && <div><span>DIFAL {imp ? Number(imp.difal_pp) + '%' : ''} (não contribuinte)</span><span>{brl(resumo.difal)}</span></div>}
          {frete === 'CIF' && Number(valorFrete) > 0 && <div><span>Frete (CIF)</span><span>{brl(Number(valorFrete))}</span></div>}
          <div className="fr-tot"><span>Total</span><span>{brl(resumo.total)}</span></div>
          {resumo.icmsDestaquePct > 0 && <p className="hint" style={{ margin: '6px 0 0' }}>ICMS de {resumo.icmsDestaquePct}% já incluso no preço dos produtos.</p>}
          {resumo.difalInfo > 0 && <p className="hint" style={{ margin: '2px 0 0' }}>DIFAL de {Number(imp.difal_pp)}% ({brl(resumo.difalInfo)}) por conta do cliente contribuinte — não somado.</p>}
        </div>
      )}

      <div className="orc-bar">
        <div className="ob-info">
          <span className="ob-n">{itens.length === 0 ? 'adicione produtos' : fiscalPendente ? 'confirme a característica fiscal' : `${itens.length} ${itens.length === 1 ? 'item' : 'itens'}${resumo.st > 0 ? ' + ST' : ''}${resumo.difal > 0 ? ' + DIFAL' : ''}${resumo.ipi > 0 ? ' + IPI' : ''}`}</span>
          <span className="ob-t">{brl(resumo.total)}</span>
        </div>
        <button className="btn" onClick={salvar} disabled={saving || itens.length === 0 || !clienteId || fiscalPendente}>
          {saving ? 'Salvando…' : 'Salvar orçamento'}
        </button>
      </div>
    </div>
  )
}
