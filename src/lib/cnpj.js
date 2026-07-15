// Preenchimento automático de empresa pelo CNPJ — BrasilAPI (grátis, sem chave).
export async function buscarCnpj(cnpj) {
  const c = (cnpj || '').replace(/\D/g, '')
  if (c.length !== 14) return null
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${c}`)
    if (!r.ok) return null
    const d = await r.json()
    const endereco = [d.descricao_tipo_de_logradouro, d.logradouro, d.numero].filter(Boolean).join(' ').trim()
    return {
      razao_social: d.razao_social || '',
      nome_fantasia: d.nome_fantasia || '',
      telefone: d.ddd_telefone_1 || '',
      email: d.email || '',
      endereco,
      bairro: d.bairro || '',
      cidade: d.municipio || '',
      estado: d.uf || '',
      cep: (d.cep ? String(d.cep) : '').replace(/(\d{5})(\d{3})/, '$1-$2'),
    }
  } catch { return null }
}
