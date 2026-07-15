// WhatsApp em 1 toque — monta o link wa.me com a mensagem pronta (grátis, sem API).
export function limparTelefone(tel) {
  let t = (tel || '').replace(/\D/g, '')
  if (!t) return ''
  if (t.length <= 11) t = '55' + t // adiciona DDI Brasil
  return t
}

export function waLink(tel, texto) {
  const t = limparTelefone(tel)
  const msg = encodeURIComponent(texto || '')
  return t ? `https://wa.me/${t}?text=${msg}` : `https://wa.me/?text=${msg}`
}

// Nome para saudação: pessoa de contato (primeiro nome) > nome fantasia > razão social.
export function primeiroNome(cli) {
  if (cli?.contato_nome) return cli.contato_nome.trim().split(/\s+/)[0]
  return cli?.nome_fantasia || cli?.razao_social || ''
}

export const TEMPLATES = [
  { id: 'abordagem', nome: 'Primeira abordagem', texto: (c) => `Olá ${c.primeiro}, tudo bem? Aqui é ${c.rep}, represento a Fuplastic na região. Gostaria de te apresentar nossas soluções em caixas de passagem e produtos plásticos. Quando seria um bom momento para conversar?` },
  { id: 'follow', nome: 'Follow-up', texto: (c) => `Oi ${c.primeiro}, tudo certo? Passando para saber se conseguiu avaliar o que conversamos. Qualquer dúvida, estou à disposição!` },
  { id: 'orcamento', nome: 'Sobre o orçamento', texto: (c) => `${c.primeiro}, tudo bem? Sobre o orçamento que preparei — deixa eu saber o que achou e se precisar ajustar algo, combinado?` },
  { id: 'posvenda', nome: 'Pós-venda', texto: (c) => `Olá ${c.primeiro}! Passando para saber se está tudo certo com o pedido e se posso ajudar em mais alguma coisa. Obrigado pela confiança!` },
  { id: 'aniversario', nome: 'Aniversário', texto: (c) => `${c.primeiro}, passando para desejar um feliz aniversário! Muita saúde e sucesso. Um abraço, ${c.rep}.` },
  { id: 'reativar', nome: 'Reativação', texto: (c) => `Oi ${c.primeiro}, quanto tempo! Estava com saudade de trabalhar com você. Novidades por aí? Bora retomar nossas conversas?` },
]
