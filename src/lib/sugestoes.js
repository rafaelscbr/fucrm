// Sugestões por REGRA (sem IA paga) — extrai chips + datas de um texto ditado.
const norm = (s) => (s || '').toLowerCase()
const WD = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 }
const iso = (d) => d.toISOString().slice(0, 10)

// Interpreta expressões de data em linguagem natural → 'yyyy-mm-dd'.
export function dataDe(texto) {
  const t = norm(texto).normalize('NFD').replace(/[^a-z0-9 ]/g, '')
  const hoje = new Date(); hoje.setHours(12, 0, 0, 0)
  const add = (n) => iso(new Date(hoje.getTime() + n * 86400000))
  if (/depois de amanha/.test(t)) return add(2)
  if (/amanha/.test(t)) return add(1)
  if (/\bhoje\b/.test(t)) return add(0)
  if (/semana que vem|proxima semana/.test(t)) return add(7)
  const emDias = t.match(/em (\d+) dias?/) || t.match(/(\d+) dias?/)
  if (emDias) return add(Number(emDias[1]))
  for (const [k, wd] of Object.entries(WD)) {
    if (t.includes(k)) { let diff = (wd - hoje.getDay() + 7) % 7; if (diff === 0) diff = 7; return add(diff) }
  }
  const diaN = t.match(/dia (\d{1,2})/)
  if (diaN) { const d = new Date(hoje); d.setDate(Number(diaN[1])); if (d < hoje) d.setMonth(d.getMonth() + 1); return iso(d) }
  return null
}

export function sugerir(texto) {
  const t = norm(texto)
  const out = []

  if (/\b(gostou|interessad|animad|elogiou|adorou|fechad|positiv)/.test(t))
    out.push({ campo: 'recepcao', valor: 'boa', label: 'Recepção boa' })
  else if (/\b(caro|sem interesse|recus|nao quis|não quis|reclam|insatisfeit|negativ)/.test(t))
    out.push({ campo: 'recepcao', valor: 'ruim', label: 'Recepção ruim' })

  const mObra = t.match(/\b(obra|obras|constru\w+|vizinh\w+|galp\w+)\b[^.,;]*/)
  if (mObra) out.push({ campo: 'obs_entorno', valor: mObra[0].trim(), label: 'Entorno: ' + mObra[0].trim().slice(0, 30) })

  const mAcao = t.match(/\b(ligar|voltar|retornar|enviar|mandar|orçar|orcar|visitar|agendar)\b[^.,;]*/)
  if (mAcao || /\b(amanh|hoje|dia \d|semana que vem|segunda|terca|terça|quarta|quinta|sexta)/.test(t)) {
    const data = dataDe(texto)
    out.push({
      campo: 'proxima_acao',
      valor: (mAcao ? mAcao[0].trim() : 'Retornar contato'),
      data,
      label: 'Próxima: ' + (mAcao ? mAcao[0].trim().slice(0, 24) : 'retornar') + (data ? ` (${data.split('-').reverse().slice(0, 2).join('/')})` : ''),
    })
  }

  const mDim = t.match(/(\d{2,4})\s*(x|por)\s*(\d{2,4})/)
  if (mDim) out.push({ campo: 'produto', valor: mDim[0], label: 'Produto: ' + mDim[0] })

  return out
}
