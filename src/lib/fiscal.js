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

// Imposto por unidade (ST ou DIFAL) sobre o preço do item.
export function impostoUnit(preco, r, imp) {
  const p = Number(preco) || 0
  if (!imp || !r || r.exportacao || p <= 0) return { tipo: null, valor: 0 }
  if (r.revenda) {
    if (imp.mva_pp == null || imp.aliq_st_pp == null) return { tipo: 'st_pendente', valor: 0 }
    const st = p * (1 + Number(imp.mva_pp) / 100) * (Number(imp.aliq_st_pp) / 100) - p * (Number(imp.aliq_inter) / 100)
    return { tipo: 'st', valor: Math.max(st, 0) }
  }
  if (r.contribuinte === false) return { tipo: 'difal', valor: p * (Number(imp.difal_pp) / 100) }
  return { tipo: null, valor: 0 } // contribuinte uso final (ou não confirmado): tabela pura
}

export const ipiUnit = (preco, aliqIpi) => (Number(aliqIpi) > 0 ? (Number(preco) || 0) * Number(aliqIpi) / 100 : 0)

// Consolida um orçamento: itens = [{quantidade, valor_unitario, aliq_ipi}]
export function resumoFiscal(itens, r, imp, frete = 0) {
  let mercadoria = 0, st = 0, difal = 0, ipi = 0, stPendente = false
  for (const it of itens || []) {
    const q = Number(it.quantidade) || 0
    const p = Number(it.valor_unitario) || 0
    mercadoria += q * p
    const im = impostoUnit(p, r, imp)
    if (im.tipo === 'st') st += im.valor * q
    if (im.tipo === 'difal') difal += im.valor * q
    if (im.tipo === 'st_pendente') stPendente = true
    if (!r?.exportacao) ipi += ipiUnit(p, it.aliq_ipi) * q
  }
  // contribuinte uso final: DIFAL existe mas é recolhido pelo CLIENTE — só informar
  const difalInfo = r && !r.exportacao && !r.revenda && r.contribuinte === true && imp
    ? mercadoria * (Number(imp.difal_pp) / 100) : 0
  // ICMS já embutido no preço (destaque): interna p/ venda dentro do estado de origem (SP), senão interestadual
  const icmsDestaquePct = r?.exportacao || !imp ? 0 : Number(imp.uf === 'SP' ? imp.aliq_interna : imp.aliq_inter)
  const total = mercadoria + st + difal + ipi + (Number(frete) || 0)
  return { mercadoria, st, difal, ipi, difalInfo, icmsDestaquePct, stPendente, total }
}

export const OBS_FISCAL = 'Valores cotados conforme característica fiscal informada pelo cliente. Divergências de característica fiscal são de responsabilidade do comprador.'
