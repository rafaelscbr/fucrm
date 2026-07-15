// FuCRM — extrai dados estruturados de um relato de visita (Gemini free tier).
// v4: modelo mais barato (flash-lite) + prompt focado em PRESERVAR DETALHES de rapport.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
// cheapest primeiro; cai para modelos mais capazes só se o barato falhar/travar
const MODELOS = ['gemini-flash-lite-latest', 'gemini-2.0-flash-lite', 'gemini-flash-latest']

async function gerar(model: string, key: string, prompt: string, ms: number) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
      signal: ctl.signal,
    })
    const d = await r.json()
    return { status: r.status, texto: d?.candidates?.[0]?.content?.parts?.[0]?.text ?? null }
  } catch (_e) {
    return { status: 0, texto: null }
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

    const prompt = `Você é o assistente de um CRM de RELACIONAMENTO para representação comercial B2B (indústria de plástico reciclado).
Seu objetivo é ajudar o vendedor a criar CONEXÃO e RAPPORT na próxima visita. O rapport mora nos DETALHES — então PRESERVE cada fato concreto e específico do relato.
É TERMINANTEMENTE PROIBIDO generalizar detalhes pessoais em termos vagos como "compromissos pessoais", "assuntos particulares", "questões pessoais" ou "motivos pessoais". Sempre registre o fato EXATO (ex.: "vai à Disney com o filho", "vai assistir à final da Copa do Mundo", "a filha vai casar em março", "comprou uma moto nova"). Preserve nomes, lugares, datas e eventos. Nunca invente o que não foi dito.

Extraia um JSON EXATAMENTE neste formato (use null quando não houver a informação):
{"resumo": string, "recepcao": "boa"|"neutra"|"ruim"|null, "proxima_acao": string|null, "proxima_acao_data": "YYYY-MM-DD"|null, "obs_entorno": string|null,
 "pessoais": {"esposa": string|null, "marido": string|null, "filha": string|null, "filho": string|null, "familia": string|null, "interesses": string|null, "aniversario": string|null, "perfil": string|null}}

Instruções por campo:
- "resumo": 2 a 3 frases sobre o NEGÓCIO (nível de interesse, etapa da negociação, o que ficou combinado). Se houve adiamento, cite o MOTIVO CONCRETO (ex.: "só vai apresentar o projeto semana que vem porque viaja à Disney com o filho e depois assiste à final da Copa do Mundo"). Não encurte a ponto de perder informação útil.
- "recepcao": clima da conversa.
- "proxima_acao" + "proxima_acao_data": hoje é ${hoje}; resolva "semana que vem", "amanhã", "dia 20", dias da semana.
- "obs_entorno": obras, vizinhança ou movimento no entorno, se citado.
- "pessoais": capture TODOS os pontos de relacionamento com MÁXIMA especificidade. "familia" = fatos familiares concretos (nomes, filhos, casamentos, nascimentos). "interesses" = viagens, eventos, hobbies e time de futebol, com detalhe. Exemplo: relato que menciona viagem à Disney com o filho e a final da Copa do Mundo deve gerar "familia": "tem um filho", "interesses": "vai viajar à Disney com o filho; vai assistir à final da Copa do Mundo".

Responda SOMENTE o JSON, sem nenhum texto fora dele.
Relato da visita: """${String(texto).slice(0, 4000)}"""`

    let ultimo = 0
    for (const modelo of MODELOS) {
      const r = await gerar(modelo, key, prompt, 18000)
      if (r.texto) return new Response(r.texto, { headers: { ...CORS, 'Content-Type': 'application/json' } })
      ultimo = r.status
      if (r.status === 429) await new Promise((ok) => setTimeout(ok, 1000))
    }
    const msg = ultimo === 429 ? 'limite do plano gratuito atingido — tente em instantes' : 'IA sem resposta no momento'
    return json({ error: msg }, 502)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
