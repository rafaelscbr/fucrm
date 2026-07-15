// FuCRM — extrai dados estruturados de um relato de visita (Gemini free tier).
// A chave fica em GEMINI_API_KEY (secret do projeto), nunca no frontend.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { texto } = await req.json()
    if (!texto || String(texto).trim().length < 5) {
      return new Response(JSON.stringify({ error: 'texto vazio' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }
    const key = Deno.env.get('GEMINI_API_KEY')
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

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      }),
    })
    const d = await r.json()
    const out = d?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!out) return new Response(JSON.stringify({ error: 'sem resposta da IA' }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } })
    return new Response(out, { headers: { ...CORS, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
})
