import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sugerir } from '../lib/sugestoes'
import { logAudit } from '../lib/audit'

const RECEPCOES = [['boa', 'Boa'], ['neutra', 'Neutra'], ['ruim', 'Ruim']]
const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

const MicSVG = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /><line x1="12" y1="18" x2="12" y2="21" />
  </svg>
)
const TextSVG = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 6h16M4 12h16M4 18h9" />
  </svg>
)

export default function RegistrarVisita() {
  const { id } = useParams()
  const nav = useNavigate()
  const { session } = useAuth()
  const [cliente, setCliente] = useState(null)
  const [etapa, setEtapa] = useState('modo')       // modo | form
  const [modo, setModo] = useState(null)           // voz | texto
  const [fala, setFala] = useState('')
  const [gravando, setGravando] = useState(false)
  const [ia, setIa] = useState('')                 // '' | rodando | ok | erro
  const [resumo, setResumo] = useState('')
  const [recepcao, setRecepcao] = useState(null)
  const [canal, setCanal] = useState('visita')
  const [tipo, setTipo] = useState('follow_up')
  const [obsEntorno, setObsEntorno] = useState('')
  const [proximaAcao, setProximaAcao] = useState('')
  const [proximaData, setProximaData] = useState('')
  const [aplicadas, setAplicadas] = useState({})
  const [pessoais, setPessoais] = useState({})
  const [saving, setSaving] = useState(false)
  const recRef = useRef(null)

  useEffect(() => {
    supabase.from('clientes')
      .select('id,razao_social,data_primeiro_registro,representante_responsavel_id,dados_pessoais')
      .eq('id', id).single().then(({ data }) => {
        setCliente(data)
        if (data && !data.data_primeiro_registro) setTipo('primeira_demonstracao')
      })
    return () => recRef.current?.stop()
  }, [id])

  const sugs = useMemo(() => sugerir(resumo), [resumo])
  const primeira = cliente && !cliente.data_primeiro_registro

  function iniciarVoz() {
    if (!SR) { setModo('texto'); setEtapa('form'); return }
    const r = new SR()
    r.lang = 'pt-BR'; r.continuous = true; r.interimResults = true
    let fin = ''
    r.onresult = (e) => {
      let inter = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript + ' '
        else inter += e.results[i][0].transcript
      }
      setFala((fin + inter).trim())
    }
    r.onend = () => setGravando(false)
    r.onerror = () => setGravando(false)
    recRef.current = r; r.start(); setGravando(true)
  }

  function pararEAnalisar() {
    recRef.current?.stop(); setGravando(false)
    if (fala.trim()) analisarIA(fala, true)
  }

  async function analisarIA(texto, ehVoz = false) {
    setIa('rodando')
    try {
      const { data, error } = await supabase.functions.invoke('ai-extrair', { body: { texto } })
      if (error || data?.error) throw new Error(data?.error || error.message)
      setResumo(ehVoz ? (data.resumo || texto) : (resumo || data.resumo || texto))
      if (data.recepcao) setRecepcao(data.recepcao)
      if (data.proxima_acao) setProximaAcao(data.proxima_acao)
      if (data.proxima_acao_data) setProximaData(data.proxima_acao_data)
      if (data.obs_entorno) setObsEntorno((v) => v || data.obs_entorno)
      const novos = Object.fromEntries(Object.entries(data.pessoais || {}).filter(([, v]) => v))
      if (Object.keys(novos).length) setPessoais((p) => ({ ...p, ...novos }))
      setIa('ok')
    } catch {
      if (ehVoz) setResumo(texto)   // fallback: usa a transcrição crua + regras
      setIa('erro')
    }
  }

  function aplicar(s) {
    setAplicadas((a) => ({ ...a, [s.label]: true }))
    if (s.campo === 'recepcao') setRecepcao(s.valor)
    if (s.campo === 'obs_entorno') setObsEntorno((v) => v || s.valor)
    if (s.campo === 'proxima_acao') { setProximaAcao(s.valor); if (s.data) setProximaData(s.data) }
    if (s.campo === 'pessoal') setPessoais((p) => {
      const np = { ...p }
      if (s.chave === 'interesses' || s.chave === 'familia') np[s.chave] = np[s.chave] ? np[s.chave] + '; ' + s.valor : s.valor
      else np[s.chave] = s.valor
      return np
    })
  }

  async function salvar() {
    if (!resumo.trim()) return
    setSaving(true)
    const { error } = await supabase.from('interacoes').insert({
      cliente_id: id, representante_id: session.user.id, canal, tipo, resumo,
      recepcao, obs_entorno: obsEntorno || null,
      proxima_acao: proximaAcao || null, proxima_acao_data: proximaData || null,
    })
    if (!error && Object.keys(pessoais).length) {
      const dp = { ...(cliente?.dados_pessoais || {}) }
      for (const [k, v] of Object.entries(pessoais)) {
        if (k === 'interesses' || k === 'familia') dp[k] = dp[k] ? dp[k] + '; ' + v : v
        else dp[k] = v
      }
      await supabase.from('clientes').update({ dados_pessoais: dp }).eq('id', id)
    }
    if (!error && (tipo === 'primeira_demonstracao' || primeira)) {
      await supabase.from('clientes').update({
        data_primeiro_registro: cliente.data_primeiro_registro || new Date().toISOString(),
        representante_primeiro_contato_id: session.user.id,
        representante_responsavel_id: cliente.representante_responsavel_id || session.user.id,
      }).eq('id', id)
    }
    setSaving(false)
    if (error) alert('Erro ao salvar: ' + error.message)
    else { await logAudit('registrar_visita', 'cliente', id); nav(`/clientes/${id}`) }
  }

  return (
    <div>
      <button className="back" onClick={() => nav(-1)}>‹ Voltar</button>
      <div className="page-head">
        <div>
          <h1>Registrar visita</h1>
          <p className="muted" style={{ fontSize: 14 }}>{cliente?.razao_social}</p>
        </div>
        {etapa === 'form' && (
          <button className="btn ghost sm" onClick={() => { recRef.current?.stop(); setEtapa('modo'); setModo(null); setFala(''); setIa('') }}>
            Trocar modo
          </button>
        )}
      </div>

      {primeira && <div className="banner accent"><span>◎</span><span><b>1ª demonstração.</b> Ao salvar, este cliente fica atribuído a você.</span></div>}

      {etapa === 'modo' && (
        <>
          <p className="muted" style={{ fontSize: 14, marginBottom: 4 }}>Como você quer registrar?</p>
          <div className="mode-grid">
            <button className="mode-tile" onClick={() => { setModo('voz'); setEtapa('form'); iniciarVoz() }}>
              <span className="mt-ic"><MicSVG /></span>
              <b>Falar</b>
              <span>Grave um áudio: a IA resume e preenche os campos para você confirmar</span>
            </button>
            <button className="mode-tile" onClick={() => { setModo('texto'); setEtapa('form') }}>
              <span className="mt-ic"><TextSVG /></span>
              <b>Digitar</b>
              <span>Escreva o que rolou e use a IA se quiser estruturar</span>
            </button>
          </div>
        </>
      )}

      {etapa === 'form' && (
        <>
          {modo === 'voz' && (
            <div className="card" style={{ textAlign: 'center', marginBottom: 16 }}>
              <button className={'mic-big' + (gravando ? ' rec' : '')}
                onClick={gravando ? pararEAnalisar : iniciarVoz}
                aria-label={gravando ? 'Parar e analisar' : 'Gravar'}>
                <MicSVG />
              </button>
              <p className="muted" style={{ fontSize: 14 }}>
                {gravando ? 'Ouvindo… toque para parar e analisar' : ia === 'rodando' ? 'Analisando com IA…' : fala ? 'Toque para regravar' : 'Toque para gravar'}
              </p>
              {fala && <div className="transcript" style={{ textAlign: 'left' }}>“{fala}”</div>}
              {fala && !gravando && ia !== 'rodando' && ia !== 'ok' && (
                <button className="btn" onClick={() => analisarIA(fala, true)}>Analisar com IA</button>
              )}
            </div>
          )}

          {ia === 'ok' && <div className="banner accent"><span>✓</span><span><b>A IA preencheu os campos abaixo.</b> Revise e confirme antes de salvar.</span></div>}
          {ia === 'erro' && <div className="banner warn"><span>!</span><span>IA indisponível agora — texto mantido e sugestões por regra ativas.</span></div>}

          {(modo === 'texto' || resumo || ia === 'ok') && (
            <div className="field">
              <label>{modo === 'voz' ? 'Resumo da visita (gerado pela IA — edite se precisar) *' : 'O que rolou? *'}</label>
              <textarea className="input" value={resumo} onChange={(e) => setResumo(e.target.value)}
                placeholder="Conte como foi a visita…" autoFocus={modo === 'texto'} />
            </div>
          )}

          {modo === 'texto' && (
            <div className="toolbar" style={{ marginBottom: 8 }}>
              <button type="button" className="btn sm" onClick={() => analisarIA(resumo)} disabled={ia === 'rodando' || !resumo.trim()}>
                {ia === 'rodando' ? 'Analisando…' : 'Analisar com IA'}
              </button>
            </div>
          )}

          {modo === 'texto' && sugs.length > 0 && (
            <div className="chips">
              {sugs.map((s) => (
                <button type="button" key={s.label}
                  className={'chip ' + (aplicadas[s.label] ? 'on' : 'sug')} onClick={() => aplicar(s)}>
                  {aplicadas[s.label] ? '✓ ' : '＋ '}{s.label}
                </button>
              ))}
            </div>
          )}

          {Object.keys(pessoais).length > 0 && (
            <>
              <label className="field" style={{ marginBottom: 4 }}><span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--faint)' }}>Pontos de relacionamento captados</span></label>
              <div className="chips">
                {Object.entries(pessoais).map(([k, v]) => (
                  <span className="chip on" key={k} style={{ cursor: 'pointer' }} title="Toque para remover"
                    onClick={() => setPessoais((p) => { const np = { ...p }; delete np[k]; return np })}>
                    {k}: {v} ✕
                  </span>
                ))}
              </div>
            </>
          )}

          <div className="field">
            <label>Foi bem recebido?</label>
            <div className="seg">
              {RECEPCOES.map(([v, l]) => (
                <button type="button" key={v} className={recepcao === v ? 'on' : ''}
                  onClick={() => setRecepcao(v)} style={{ fontSize: 14, fontWeight: 600 }}>{l}</button>
              ))}
            </div>
          </div>

          <div className="grid-form">
            <div className="field"><label>Canal</label>
              <select className="select" value={canal} onChange={(e) => setCanal(e.target.value)}>
                <option value="visita">Visita</option><option value="telefone">Telefone</option>
                <option value="whatsapp">WhatsApp</option><option value="email">E-mail</option></select></div>
            <div className="field"><label>Tipo</label>
              <select className="select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="primeira_demonstracao">1ª demonstração</option>
                <option value="follow_up">Follow-up</option><option value="negociacao">Negociação</option>
                <option value="pos_venda">Pós-venda</option><option value="ocorrencia">Ocorrência</option></select></div>
            <div className="field"><label>Próxima ação (opcional)</label>
              <input className="input" value={proximaAcao} onChange={(e) => setProximaAcao(e.target.value)} /></div>
            <div className="field"><label>Quando</label>
              <input className="input" type="date" value={proximaData} onChange={(e) => setProximaData(e.target.value)} /></div>
            <div className="field full"><label>Observação de entorno</label>
              <input className="input" value={obsEntorno} onChange={(e) => setObsEntorno(e.target.value)} /></div>
          </div>

          <button className="btn block" onClick={salvar} disabled={saving || !resumo.trim()}>
            {saving ? 'Salvando…' : 'Confirmar e salvar visita'}
          </button>
        </>
      )}
    </div>
  )
}
