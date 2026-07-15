// Casa a busca do rep (código TOTVS, descrição ou NCM) com o produto.
export function matchProduto(prod, termo) {
  if (!termo) return true
  const alvo = `${prod.codigo_totvs || ''} ${prod.descricao || ''} ${prod.tipo_totvs || ''} ${prod.ncm || ''} ${prod.grupo_totvs || ''}`.toLowerCase()
  const palavras = termo.toLowerCase().split(/\s+/).filter(Boolean)
  return palavras.every((p) => alvo.includes(p))
}

// Rótulos dos tipos de produto do TOTVS (SB1).
export const TIPO_TOTVS = {
  PA: 'Produto acabado', PI: 'Produto intermediário', PV: 'Revenda',
  MP: 'Matéria-prima', MC: 'Material de consumo', EM: 'Embalagem',
  MO: 'Mão de obra', SV: 'Serviço', AI: 'Ativo imobilizado',
  BN: 'Bem', GG: 'Uso e consumo', OI: 'Outros insumos',
}
export const tipoTotvsLabel = (t) => TIPO_TOTVS[t] || t || '—'
