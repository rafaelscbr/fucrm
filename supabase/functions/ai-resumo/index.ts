// FuCRM — briefing do cliente por IA (antes da visita). Gemini free tier.
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
    const { cliente, interacoes, pessoais } = await req.json()
    const key = Deno.env.get('GEMINI_API_KEY')!
    const hist = (interacoes || []).slice(0, 20).map((i: { data: string; resumo: string; recepcao?: string }) =>
      `- ${(i.data || '').slice(0, 10)}: ${i.resumo || ''}${i.recepcao ? ` (recepção ${i.recepcao})` : ''}`).join('\n')
    const prompt = `Você é o assistente de um vendedor B2B (indústria de plástico). Prepare um BRIEFING para ele antes de visitar este cliente. Foque em criar CONEXÃO: use os detalhes pessoais. Seja específico e prático, nada genérico.
Cliente: ${cliente?.razao_social || '—'} (${cliente?.cidade || ''}/${cliente?.estado || ''}).
Dados pessoais conhecidos: ${JSON.stringify(pessoais || {})}
Histórico de contatos:
${hist || '(sem histórico ainda)'}

Responda um JSON: {"briefing": "2 a 4 frases resumindo a relação e o momento comercial", "ganchos": ["gancho de conversa 1 baseado em detalhe pessoal", "gancho 2"], "sugestao": "próximo passo comercial recomendado"}. Responda SOMENTE o JSON.`
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
