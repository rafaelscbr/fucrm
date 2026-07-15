// Sugestões por REGRA (sem IA paga) — extrai da fala: recepção, próxima ação (com data),
// e PONTOS DE RAPPORT (esposa, filhos, viagem, time…) para lembrar na próxima visita.
const norm = (s) => (s || '').toLowerCase()
const WD = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 }
const iso = (d) => d.toISOString().slice(0, 10)
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const STOP = ['de', 'da', 'do', 'e', 'eh', 'que', 'tem', 'uma', 'um', 'anos', 'muito', 'ele', 'ela', 'nao', 'não', 'chama', 'se']

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

function nomeApos(t, gatilho) {
  const m = t.match(new RegExp(gatilho + '\\s*(?:se chama|chama-se|chama|e chama|é|eh|e|:)?\\s+([a-zà-ú]{2,})', 'i'))
  if (m && !STOP.includes(m[1])) return cap(m[1])
  return null
}

// Extrai pontos de relacionamento (rapport) do texto.
export function extrairPessoais(texto) {
  const t = norm(texto)
  const out = []
  const push = (chave, valor, label) => out.push({ campo: 'pessoal', chave, valor, label })

  const esposa = nomeApos(t, '(?:esposa|mulher)')
  if (esposa) push('esposa', esposa, 'Esposa: ' + esposa)
  const marido = nomeApos(t, '(?:marido|esposo)')
  if (marido) push('marido', marido, 'Marido: ' + marido)
  const filha = nomeApos(t, 'filha')
  if (filha) push('filha', filha, 'Filha: ' + filha)
  const filho = nomeApos(t, 'filho')
  if (filho) push('filho', filho, 'Filho: ' + filho)

  if (!filha && /\btem\s+(uma\s+)?filha/.test(t)) push('familia', 'tem filha', 'Família: tem filha')
  if (!filho && /\btem\s+(um\s+)?filho/.test(t)) push('familia', 'tem filho', 'Família: tem filho')
  if (/\b(é|e|eh)\s+(av[oó]|vov[oó]|v[oó])\b/.test(t)) push('perfil', 'é avô/avó', 'Perfil: é avô/avó')
  if (/\bcasad[oa]\b/.test(t)) push('familia', 'casado(a)', 'Família: casado(a)')

  const viajou = t.match(/viajou\s+(?:para|pra|a)\s+([a-zà-ú ]{3,22})/)
  if (viajou) push('interesses', 'viagem a ' + viajou[1].trim(), 'Viagem: ' + viajou[1].trim())
  else if (/\b(fez|fizeram|voltou de)\s+(uma\s+)?viagem/.test(t)) push('interesses', 'fez viagem', 'Interesse: fez viagem')

  const torce = t.match(/torce\s+(?:pelo|pra|para|pro)\s+([a-zà-ú]{3,})/)
  if (torce) push('interesses', 'torce pelo ' + cap(torce[1]), 'Time: ' + cap(torce[1]))

  const gosta = t.match(/gosta\s+de\s+([a-zà-ú ]{3,22})/)
  if (gosta) push('interesses', 'gosta de ' + gosta[1].trim(), 'Gosta de: ' + gosta[1].trim())

  const aniv = t.match(/anivers[aá]rio\s+(?:é\s+|dia\s+|em\s+)?(\d{1,2}(?:\/\d{1,2})?)/)
  if (aniv) push('aniversario', aniv[1], 'Aniversário: ' + aniv[1])

  return out
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
      campo: 'proxima_acao', valor: (mAcao ? mAcao[0].trim() : 'Retornar contato'), data,
      label: 'Próxima: ' + (mAcao ? mAcao[0].trim().slice(0, 24) : 'retornar') + (data ? ` (${data.split('-').reverse().slice(0, 2).join('/')})` : ''),
    })
  }

  const mDim = t.match(/(\d{2,4})\s*(x|por)\s*(\d{2,4})/)
  if (mDim) out.push({ campo: 'produto', valor: mDim[0], label: 'Produto: ' + mDim[0] })

  out.push(...extrairPessoais(texto))
  return out
}
