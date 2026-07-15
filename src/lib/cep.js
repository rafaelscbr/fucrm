// Preenchimento automático de endereço pelo CEP — ViaCEP (grátis, sem chave).
export async function buscarCep(cep) {
  const c = (cep || '').replace(/\D/g, '')
  if (c.length !== 8) return null
  try {
    const r = await fetch(`https://viacep.com.br/ws/${c}/json/`)
    const d = await r.json()
    if (d.erro) return null
    return { logradouro: d.logradouro || '', bairro: d.bairro || '', cidade: d.localidade || '', estado: d.uf || '', cep: d.cep || '' }
  } catch { return null }
}
