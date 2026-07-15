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
  confirmado: 'Cliente confirmou',
  em_aprovacao: 'Em aprovação',
  aprovado: 'Aprovado · Pedido',
  lancado_totvs: 'Lançado no TOTVS',
  faturado: 'Faturado',
  perdido: 'Perdido',
  cancelado: 'Cancelado',
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

export function initials(name = '?') {
  const p = (name || '?').trim().split(/\s+/)
  return ((p[0]?.[0] || '') + (p[1]?.[0] || p[0]?.[1] || '')).toUpperCase()
}
