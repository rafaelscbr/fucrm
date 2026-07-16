// FuCRM — "Me prepare para essa visita": briefing completo de pré-visita por IA.
// Junta relação + pessoais + orçamentos + o que oferecer (cross-sell da região). Gemini free tier.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const MODELOS = ['gemini-flash-lite-latest', 'gemini-2.0-flash-lite', 'gemini-flash-latest']

async function gerar(model: string, key: string, prompt: string, ms: number) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.3 } }),
      signal: ctl.signal,
    })
    const d = await r.json()
    return { status: r.status, texto: d?.candidates?.[0]?.content?.parts?.[0]?.text ?? null }
  } catch { return { status: 0, texto: null } } finally { clearTimeout(t) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })
  try {
    const { cliente, pessoais, interacoes, orcamentos, produtosRegiao } = await req.json()
    const key = Deno.env.get('GEMINI_API_KEY')!
    const hist = (interacoes || []).slice(0, 15).map((i: { data: string; resumo: string; recepcao?: string }) =>
      `- ${(i.data || '').slice(0, 10)}: ${i.resumo || ''}${i.recepcao ? ` (recepção ${i.recepcao})` : ''}`).join('\n')
    const orcs = (orcamentos || []).slice(0, 10).map((o: { numero: number; status: string; valor: number; data: string }) =>
      `- #${o.numero} · ${o.status} · R$ ${o.valor} · ${(o.data || '').slice(0, 10)}`).join('\n')
    const prods = (produtosRegiao || []).slice(0, 6).map((p: { codigo: string; descricao: string; vezes: number }) =>
      `- ${p.descricao} (${p.codigo}) — vendido ${p.vezes}x na região`).join('\n')

    const prompt = `Você é o assistente de um vendedor B2B da Fuplastic (indústria de plástico: caixas de passagem, canaletas, produtos plásticos). Ele vai VISITAR este cliente agora e você deve prepará-lo por completo.
REGRAS: seja específico e prático, nada genérico. PROIBIDO generalizar detalhes pessoais — cite-os EXATAMENTE como estão (nomes, times, viagens, filhos). Se um dado não existir, não invente.

CLIENTE: ${cliente?.razao_social || '—'} (${cliente?.cidade || ''}/${cliente?.estado || ''}) · estágio: ${cliente?.estagio || '—'} · tipo: ${cliente?.tipo_cliente || '—'}${cliente?.data_ultima_compra ? ` · última compra: ${String(cliente.data_ultima_compra).slice(0, 10)}` : ''}
PESSOA DE CONTATO: ${cliente?.contato_nome ? `${cliente.contato_nome}${cliente?.contato_cargo ? ` (${cliente.contato_cargo})` : ''}` : 'não cadastrada'}
DADOS PESSOAIS CONHECIDOS: ${JSON.stringify(pessoais || {})}
HISTÓRICO DE CONTATOS:
${hist || '(sem histórico ainda)'}
ORÇAMENTOS DO CLIENTE:
${orcs || '(nenhum orçamento ainda)'}
PRODUTOS QUE CLIENTES PARECIDOS DA REGIÃO COMPRAM (e este cliente ainda não comprou):
${prods || '(sem dados da região)'}

Responda um JSON:
{"briefing": "2 a 4 frases: momento da relação e situação comercial (cite orçamento parado/perdido/faturado se houver)",
 "ganchos": ["gancho de conversa 1 com detalhe pessoal exato", "gancho 2"],
 "oferecer": ["produto ou oportunidade 1 com o porquê em 1 frase", "item 2"],
 "abordagem": "como abrir a conversa e qual o objetivo desta visita, em 1-2 frases"}
Responda SOMENTE o JSON.`
    let ultimo = 0
    for (const m of MODELOS) {
      const r = await gerar(m, key, prompt, 18000)
      if (r.texto) return new Response(r.texto, { headers: { ...CORS, 'Content-Type': 'application/json' } })
      ultimo = r.status
      if (r.status === 429) await new Promise((ok) => setTimeout(ok, 1000))
    }
    return json({ error: ultimo === 429 ? 'limite do plano gratuito atingido' : 'IA sem resposta' }, 502)
  } catch (e) { return json({ error: String(e) }, 500) }
})
