// Sugestões por REGRA (sem IA paga) — extrai chips de um texto ditado.
const norm = (s) => (s || '').toLowerCase()

export function sugerir(texto) {
  const t = norm(texto)
  const out = []

  // Recepção
  if (/\b(gostou|interessad|animad|elogiou|adorou|fechad|positiv)/.test(t))
    out.push({ campo: 'recepcao', valor: 'boa', label: 'Recepção 😀 boa' })
  else if (/\b(caro|sem interesse|recus|não quis|nao quis|reclam|insatisfeit|negativ)/.test(t))
    out.push({ campo: 'recepcao', valor: 'ruim', label: 'Recepção 🙁 ruim' })

  // Entorno
  const mObra = t.match(/\b(obra|obras|constru\w+|vizinh\w+|galp\w+)\b[^.,;]*/)
  if (mObra) out.push({ campo: 'obs_entorno', valor: mObra[0].trim(), label: 'Entorno: ' + mObra[0].trim().slice(0, 30) })

  // Próxima ação (ligar/voltar/retornar em N dias)
  const mAcao = t.match(/\b(ligar|voltar|retornar|enviar|mandar|orçar|orcar)\b[^.,;]*/)
  if (mAcao) {
    const dias = t.match(/(\d+)\s*dias?/)
    out.push({
      campo: 'proxima_acao',
      valor: mAcao[0].trim(),
      dias: dias ? Number(dias[1]) : null,
      label: 'Próxima: ' + mAcao[0].trim().slice(0, 26) + (dias ? ` (${dias[1]}d)` : ''),
    })
  }

  // Produto citado (dimensões)
  const mDim = t.match(/(\d{2,4})\s*(x|por)\s*(\d{2,4})/)
  if (mDim) out.push({ campo: 'produto', valor: mDim[0], label: 'Produto: ' + mDim[0] })

  return out
}
