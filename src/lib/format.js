export const brl = (n) =>
  (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const tipoClienteLabel = {
  consumidor_final: 'Consumidor final',
  revendedor: 'Revendedor',
  exportacao: 'Exportação',
  produtor_rural: 'Produtor rural',
}

export const statusLabel = {
  rascunho: 'Rascunho',
  enviado: 'Enviado ao cliente',
  aguardando_totvs: 'Aguardando cadastro no TOTVS',
  lancado_totvs: 'Lançado no TOTVS',
  faturado: 'Faturado',
  perdido: 'Perdido',
  cancelado: 'Cancelado',
  // legados
  confirmado: 'Cliente confirmou', em_aprovacao: 'Em aprovação', aprovado: 'Aprovado',
}

export const canalLabel = {
  visita: 'Visita', telefone: 'Telefone', whatsapp: 'WhatsApp', email: 'E-mail', outro: 'Outro',
}

export const tipoInteracaoLabel = {
  primeira_demonstracao: '1ª demonstração', follow_up: 'Follow-up',
  negociacao: 'Negociação', pos_venda: 'Pós-venda', ocorrencia: 'Ocorrência', outro: 'Outro',
}

export function diasAtras(date) {
  if (!date) return null
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (d <= 0) return 'hoje'
  if (d === 1) return 'ontem'
  return `${d} dias`
}

export function dataBR(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR')
}

export function tempoRel(date) {
  if (!date) return ''
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'agora'
  const m = Math.floor(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ontem'
  if (d < 7) return `há ${d} dias`
  return new Date(date).toLocaleDateString('pt-BR')
}

export function initials(name = '?') {
  const p = (name || '?').trim().split(/\s+/)
  return ((p[0]?.[0] || '') + (p[1]?.[0] || p[0]?.[1] || '')).toUpperCase()
}
