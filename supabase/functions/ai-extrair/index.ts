// FuCRM — extrai dados estruturados de um relato de visita (Gemini free tier).
// v3: timeout de 18s + modelo reserva (o free tier do Google às vezes trava/limita).
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const MODELOS = ['gemini-flash-latest', 'gemini-3.1-flash-lite']

async function gerar(model: string, key: string, prompt: string, ms: number) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      }),
      signal: ctl.signal,
    })
    const d = await r.json()
    return { status: r.status, texto: d?.candidates?.[0]?.content?.parts?.[0]?.text ?? null }
  } catch (_e) {
    return { status: 0, texto: null }          // timeout/rede
  } finally { clearTimeout(t) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })
  try {
    const { texto } = await req.json()
    if (!texto || String(texto).trim().length < 5) return json({ error: 'texto vazio' }, 400)
    const key = Deno.env.get('GEMINI_API_KEY')!
    const hoje = new Date().toISOString().slice(0, 10)
    const prompt = `Você é o assistente de um CRM de vendas B2B (indústria de plástico). Extraia do relato de visita abaixo um JSON EXATAMENTE neste formato (use null quando não houver a informação):
{"resumo": "resumo objetivo da visita em 1-2 frases",
 "recepcao": "boa" | "neutra" | "ruim" | null,
 "proxima_acao": "texto curto da próxima ação" | null,
 "proxima_acao_data": "YYYY-MM-DD" | null,
 "obs_entorno": "observações sobre obras/vizinhança/entorno" | null,
 "pessoais": {"esposa": null, "marido": null, "filha": null, "filho": null, "familia": null, "interesses": null, "aniversario": null, "perfil": null}}
Regras: hoje é ${hoje} (use para resolver "amanhã", "sexta", "dia 20"). Em "pessoais" capture pontos de relacionamento (nomes de familiares, viagens, time de futebol, hobbies, "é avó", aniversário). "interesses" concatena viagens/time/hobbies. Responda SOMENTE o JSON.
Relato: """${String(texto).slice(0, 4000)}"""`

    let ultimo = 0
    for (const modelo of MODELOS) {
      const r = await gerar(modelo, key, prompt, 18000)
      if (r.texto) return new Response(r.texto, { headers: { ...CORS, 'Content-Type': 'application/json' } })
      ultimo = r.status
      if (r.status === 429) await new Promise((ok) => setTimeout(ok, 1200))
    }
    const msg = ultimo === 429 ? 'limite do plano gratuito atingido — tente em instantes' : 'IA sem resposta no momento'
    return json({ error: msg }, 502)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
