// Motor fiscal Fuplastic (linha polipropileno). Percentuais em % (12 = 12%).
// Regras da Ju (TOTVS): contribuinte+uso final = tabela pura (DIFAL por conta do cliente,
// só informativo) · NÃO contribuinte = DIFAL embutido · revenda = ICMS-ST somado ·
// exportação = sem impostos. ST = P×(1+MVA)×alíq.ST − P×alíq.inter (ex. RS: MVA 116,53%, 12%).

export function regraFiscal(cliente, contribuinte) {
  return {
    exportacao: cliente?.tipo_cliente === 'exportacao',
    revenda: cliente?.tipo_cliente === 'revendedor',
    contribuinte, // true | false | null (não confirmado)
  }
}

const r2 = (x) => Math.round(x * 100) / 100 // 2 casas — usado nos TOTAIS (Protheus arredonda por item, não por unidade)

// Imposto por unidade (ST ou DIFAL) sobre o preço do item — SEM arredondar (precisão total;
// arredondamento só na apresentação/totais, senão qtd grande acumula desvio vs TOTVS).
// temSt: produto sujeito à substituição tributária (tem CEST) — sem CEST não existe ST.
export function impostoUnit(preco, r, imp, temSt = true) {
  const p = Number(preco) || 0
  if (!imp || !r || r.exportacao || p <= 0) return { tipo: null, valor: 0 }
  if (r.revenda) {
    if (!temSt) return { tipo: null, valor: 0 } // revenda de item sem ST: ICMS normal já no preço
    if (imp.mva_pp == null || imp.aliq_st_pp == null) return { tipo: 'st_pendente', valor: 0 }
    const st = p * (1 + Number(imp.mva_pp) / 100) * (Number(imp.aliq_st_pp) / 100) - p * (Number(imp.aliq_inter) / 100)
    return { tipo: 'st', valor: Math.max(st, 0) }
  }
  if (r.contribuinte === false) return { tipo: 'difal', valor: p * (Number(imp.difal_pp) / 100) }
  return { tipo: null, valor: 0 } // contribuinte uso final (ou não confirmado): tabela pura
}

export const ipiUnit = (preco, aliqIpi) => (Number(aliqIpi) > 0 ? (Number(preco) || 0) * Number(aliqIpi) / 100 : 0)

// Consolida um orçamento — IGUAL AO PROTHEUS: frete CIF integra a base de ICMS-ST,
// DIFAL e IPI, rateado proporcionalmente entre os itens (como a NF-e faz).
// Validado contra o espelho #027896: base 3.800 + frete 1,00 → base 3.801 → ST 403,67.
// Retorna também porItem[] (imposto_unit/ipi_unit com o frete rateado) p/ gravar por item.
export function calcularFiscal(itens, r, imp, frete = 0) {
  const arr = itens || []
  const f = Number(frete) || 0
  const mercadoria = arr.reduce((s, it) => s + (Number(it.quantidade) || 0) * (Number(it.valor_unitario) || 0), 0)
  let st = 0, difal = 0, ipi = 0, stPendente = false
  const porItem = arr.map((it) => {
    const q = Number(it.quantidade) || 0
    const p = Number(it.valor_unitario) || 0
    const vItem = q * p
    const fItem = mercadoria > 0 ? f * (vItem / mercadoria) : 0 // rateio proporcional do frete
    const baseUnit = q > 0 ? (vItem + fItem) / q : 0            // base unitária COM frete
    const im = impostoUnit(baseUnit, r, imp, it.tem_st !== false)
    const ipiU = r?.exportacao ? 0 : ipiUnit(baseUnit, it.aliq_ipi)
    if (im.tipo === 'st') st += im.valor * q
    if (im.tipo === 'difal') difal += im.valor * q
    if (im.tipo === 'st_pendente') stPendente = true
    ipi += ipiU * q
    return { imposto_unit: im.valor, ipi_unit: ipiU, tipo: im.tipo }
  })
  // contribuinte uso final: DIFAL existe mas é recolhido pelo CLIENTE — só informar (base tb com frete)
  const difalInfo = r && !r.exportacao && !r.revenda && r.contribuinte === true && imp
    ? (mercadoria + f) * (Number(imp.difal_pp) / 100) : 0
  // ICMS já embutido no preço (destaque): interna p/ venda dentro do estado de origem (SP), senão interestadual
  const icmsDestaquePct = r?.exportacao || !imp ? 0 : Number(imp.uf === 'SP' ? imp.aliq_interna : imp.aliq_inter)
  st = r2(st); difal = r2(difal); ipi = r2(ipi)
  const total = r2(mercadoria + st + difal + ipi + f)
  return { porItem, mercadoria: r2(mercadoria), st, difal, ipi, difalInfo: r2(difalInfo), icmsDestaquePct, stPendente, total }
}

// compat: mesmo cálculo, sem os dados por item
export const resumoFiscal = (itens, r, imp, frete = 0) => calcularFiscal(itens, r, imp, frete)

export const OBS_FISCAL = 'Valores cotados conforme característica fiscal informada pelo cliente. Divergências de característica fiscal são de responsabilidade do comprador.'
