// minúsculas + sem acento
const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
// só letras/números — casa código ou NCM digitado com ou sem pontuação/espaço
const alnum = (s) => norm(s).replace(/[^a-z0-9]/g, '')

// Casa a busca do rep (código TOTVS, descrição ou NCM) com o produto.
export function matchProduto(prod, termo) {
  if (!termo) return true
  const texto = norm(`${prod.codigo_totvs || ''} ${prod.descricao || ''} ${prod.tipo_totvs || ''} ${prod.ncm || ''} ${prod.grupo_totvs || ''}`)
  const codigo = alnum(`${prod.codigo_totvs || ''} ${prod.ncm || ''}`)
  const palavras = norm(termo).split(/\s+/).filter(Boolean)
  return palavras.every((p) => texto.includes(p) || (alnum(p).length >= 3 && codigo.includes(alnum(p))))
}

// Rótulos dos tipos de produto do TOTVS (SB1).
export const TIPO_TOTVS = {
  PA: 'Produto acabado', PI: 'Produto intermediário', PV: 'Revenda',
  MP: 'Matéria-prima', MC: 'Material de consumo', EM: 'Embalagem',
  MO: 'Mão de obra', SV: 'Serviço', AI: 'Ativo imobilizado',
  BN: 'Bem', GG: 'Uso e consumo', OI: 'Outros insumos',
}
export const tipoTotvsLabel = (t) => TIPO_TOTVS[t] || t || '—'
