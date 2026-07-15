import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sugerir } from '../lib/sugestoes'
import { logAudit } from '../lib/audit'
import VoiceButton from '../components/VoiceButton'

const RECEPCOES = [['boa', '😀'], ['neutra', '😐'], ['ruim', '🙁']]

export default function RegistrarVisita() {
  const { id } = useParams()
  const nav = useNavigate()
  const { session } = useAuth()
  const [cliente, setCliente] = useState(null)
  const [resumo, setResumo] = useState('')
  const [recepcao, setRecepcao] = useState(null)
  const [canal, setCanal] = useState('visita')
  const [tipo, setTipo] = useState('follow_up')
  const [obsEntorno, setObsEntorno] = useState('')
  const [proximaAcao, setProximaAcao] = useState('')
  const [proximaData, setProximaData] = useState('')
  const [aplicadas, setAplicadas] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('clientes')
      .select('id,razao_social,data_primeiro_registro,representante_responsavel_id')
      .eq('id', id).single().then(({ data }) => {
        setCliente(data)
        if (data && !data.data_primeiro_registro) setTipo('primeira_demonstracao')
      })
  }, [id])

  const sugs = useMemo(() => sugerir(resumo), [resumo])
  const primeira = cliente && !cliente.data_primeiro_registro

  function aplicar(s) {
    setAplicadas((a) => ({ ...a, [s.label]: true }))
    if (s.campo === 'recepcao') setRecepcao(s.valor)
    if (s.campo === 'obs_entorno') setObsEntorno((v) => v || s.valor)
    if (s.campo === 'proxima_acao') {
      setProximaAcao(s.valor)
      if (s.data) setProximaData(s.data)
    }
  }

  async function salvar() {
    if (!resumo.trim()) return
    setSaving(true)
    const { error } = await supabase.from('interacoes').insert({
      cliente_id: id, representante_id: session.user.id, canal, tipo, resumo,
      recepcao, obs_entorno: obsEntorno || null,
      proxima_acao: proximaAcao || null, proxima_acao_data: proximaData || null,
    })
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
      </div>

      {primeira && <div className="banner accent"><span>◎</span><span><b>1ª demonstração.</b> Ao salvar, este cliente fica atribuído a você.</span></div>}

      <div className="field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ margin: 0 }}>O que rolou? *</label>
          <VoiceButton onResult={setResumo} />
        </div>
        <textarea className="input" value={resumo} onChange={(e) => setResumo(e.target.value)}
          placeholder="Toque em Falar e conte a visita…" autoFocus />
      </div>
      <p className="hint">Toque em <b>Falar</b> para ditar por voz (grátis). O sistema entende datas como “amanhã” ou “dia 20” e já sugere a próxima ação.</p>

      {sugs.length > 0 && (
        <>
          <label className="field" style={{ marginBottom: 4 }}><span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--faint)' }}>Sugestões — toque para aplicar</span></label>
          <div className="chips">
            {sugs.map((s) => (
              <button type="button" key={s.label}
                className={'chip ' + (aplicadas[s.label] ? 'on' : 'sug')} onClick={() => aplicar(s)}>
                {aplicadas[s.label] ? '✓ ' : '＋ '}{s.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="field">
        <label>Foi bem recebido?</label>
        <div className="seg">
          {RECEPCOES.map(([v, e]) => (
            <button type="button" key={v} className={recepcao === v ? 'on' : ''} onClick={() => setRecepcao(v)}>{e}</button>
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
        {saving ? 'Salvando…' : 'Salvar visita'}
      </button>
    </div>
  )
}
