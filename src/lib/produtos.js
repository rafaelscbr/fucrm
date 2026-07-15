// Casa a busca do rep ("600 600 490", "caixa 600") com o código inteligente.
export function matchProduto(prod, termo) {
  if (!termo) return true
  const alvo = `${prod.codigo_inteligente || ''} ${prod.descricao || ''} ${prod.tipo || ''} ${prod.comprimento_mm || ''} ${prod.largura_mm || ''} ${prod.altura_mm || ''}`.toLowerCase()
  const palavras = termo.toLowerCase().split(/\s+/).filter(Boolean)
  return palavras.every((p) => alvo.includes(p))
}

// Monta o código inteligente a partir de tipo + dimensões (zeros à esquerda, 5/4 dígitos).
export function montarCodigo({ tipo, comprimento, largura, altura }) {
  const pad = (n, len) => String(n || 0).padStart(len, '0')
  const prefixo = tipo === 'Tampa ST' ? 'TST' : 'CST'
  const partes = [prefixo, pad(comprimento, 5), pad(largura, 4)]
  if (tipo !== 'Tampa ST') partes.push(pad(altura, 4))
  return partes.join(' ')
}
