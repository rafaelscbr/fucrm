// Dias até o próximo aniversário a partir de um texto ("12/03", "dia 12/3", etc.)
export function diasAteAniversario(str) {
  if (!str) return null
  const m = String(str).match(/(\d{1,2})\s*[/\-.]\s*(\d{1,2})/)
  if (!m) return null
  const dia = +m[1], mes = +m[2] - 1
  if (mes < 0 || mes > 11 || dia < 1 || dia > 31) return null
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  let prox = new Date(hoje.getFullYear(), mes, dia)
  if (prox < hoje) prox = new Date(hoje.getFullYear() + 1, mes, dia)
  return Math.round((prox - hoje) / 86400000)
}

export function rotaUrl(cliente) {
  const partes = [cliente.endereco, cliente.cidade, cliente.estado, 'Brasil'].filter(Boolean).join(', ')
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(partes)}`
}

// Haversine em km entre [lng,lat] e [lng,lat]
export function distanciaKm(a, b) {
  if (!a || !b) return Infinity
  const R = 6371, rad = (d) => d * Math.PI / 180
  const dLat = rad(b[1] - a[1]), dLng = rad(b[0] - a[0])
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}
