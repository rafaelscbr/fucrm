import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { coordCliente } from '../lib/cidades'
import { distanciaKm, rotaUrl } from '../lib/rapport'

const hojeISO = () => new Date().toISOString().slice(0, 10)
const horaBR = (ts) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export default function RotaDia() {
  const nav = useNavigate()
  const { session } = useAuth()
  const toast = useToast()
  const uid = session?.user?.id
  const [paradas, setParadas] = useState(null)
  const [meus, setMeus] = useState([])
  const [addOpen, setAddOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const [pos, setPos] = useState(null)
  const [busy, setBusy] = useState(null)

  async function load() {
    const { data } = await supabase.from('rota_dia')
      .select('*, cliente:clientes(id,razao_social,cidade,estado,endereco,contato_nome,lat,lng)')
      .eq('dia', hojeISO()).eq('representante_id', uid)
      .order('ordem').order('created_at')
    setParadas(data || [])
  }
  useEffect(() => { if (uid) load() }, [uid]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(
      (p) => setPos([p.coords.longitude, p.coords.latitude]), () => {}, { enableHighAccuracy: true, timeout: 8000 })
  }, [])

  async function abrirAdd() {
    if (meus.length === 0) {
      const { data } = await supabase.from('clientes')
        .select('id,razao_social,cidade,estado')
        .eq('representante_responsavel_id', uid).neq('estagio', 'descartado').order('razao_social')
      setMeus(data || [])
    }
    setBusca(''); setAddOpen(true)
  }
  async function add(c) {
    const ordem = (paradas?.length || 0) + 1
    const { error } = await supabase.from('rota_dia').insert({ representante_id: uid, cliente_id: c.id, ordem })
    if (error) toast(error.code === '23505' ? 'Já está na rota de hoje.' : 'Não foi possível adicionar.', 'erro')
    else toast('Adicionado à rota')
    setAddOpen(false); load()
  }
  async function remover(p) { await supabase.from('rota_dia').delete().eq('id', p.id); load() }

  async function ordenarPorProximidade() {
    if (!pos) { toast('Ative a localização para ordenar.', 'erro'); return }
    const comDist = [...paradas].sort((a, b) =>
      distanciaKm(pos, coordCliente(a.cliente)) - distanciaKm(pos, coordCliente(b.cliente)))
    await Promise.all(comDist.map((p, i) => supabase.from('rota_dia').update({ ordem: i + 1 }).eq('id', p.id)))
    toast('Rota ordenada pela distância')
    load()
  }

  function checkin(p) {
    if (!navigator.geolocation) { toast('GPS indisponível neste aparelho.', 'erro'); return }
    setBusy(p.id)
    navigator.geolocation.getCurrentPosition(async (g) => {
      await supabase.from('rota_dia').update({
        checkin_em: new Date().toISOString(), checkin_lat: g.coords.latitude, checkin_lng: g.coords.longitude,
      }).eq('id', p.id)
      if (navigator.vibrate) navigator.vibrate([40, 60, 40])
      toast('Check-in registrado')
      setBusy(null); load()
    }, () => { setBusy(null); toast('Não consegui sua localização — verifique a permissão do GPS.', 'erro') },
    { enableHighAccuracy: true, timeout: 12000 })
  }

  const feitas = (paradas || []).filter((p) => p.checkin_em).length
  const pendentes = (paradas || []).filter((p) => !p.checkin_em)

  const mapsUrl = useMemo(() => {
    if (pendentes.length === 0) return null
    const end = (c) => [c?.endereco, c?.cidade, c?.estado, 'Brasil'].filter(Boolean).join(', ')
    const dest = end(pendentes[pendentes.length - 1].cliente)
    const way = pendentes.slice(0, -1).map((p) => end(p.cliente)).join('|')
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}${way ? `&waypoints=${encodeURIComponent(way)}` : ''}&travelmode=driving`
  }, [paradas]) // eslint-disable-line react-hooks/exhaustive-deps

  const achados = useMemo(() => {
    const t = busca.toLowerCase()
    const ids = new Set((paradas || []).map((p) => p.cliente_id))
    return meus.filter((c) => !ids.has(c.id) && (!t || `${c.razao_social} ${c.cidade || ''}`.toLowerCase().includes(t))).slice(0, 30)
  }, [meus, busca, paradas])

  if (paradas === null) return <div className="spinner" />

  return (
    <div>
      <div className="page-head">
        <h1>Rota do dia</h1>
        {paradas.length > 0 && <span className={'pill ' + (feitas === paradas.length ? 'g' : 'n')}>{feitas}/{paradas.length} visitadas</span>}
      </div>

      <div className="toolbar">
        <button className="btn sm" onClick={abrirAdd}>＋ Adicionar cliente</button>
        {paradas.length > 1 && <button className="btn ghost sm" onClick={ordenarPorProximidade}>Ordenar por proximidade</button>}
        {mapsUrl && <a className="btn ghost sm" href={mapsUrl} target="_blank" rel="noreferrer">Abrir rota no Maps</a>}
      </div>
      {!pos && paradas.length > 0 && <p className="hint">Permita a localização para ordenar por distância e fazer check-in.</p>}

      {paradas.length === 0 ? (
        <div className="empty">Nenhuma parada hoje. Adicione clientes e monte sua rota de visitas.</div>
      ) : (
        paradas.map((p, idx) => {
          const c = p.cliente
          const dist = pos && c ? distanciaKm(pos, coordCliente(c)) : null
          const feito = !!p.checkin_em
          return (
            <div className={'card stop' + (feito ? ' done' : '')} key={p.id} style={{ marginBottom: 10, padding: '13px 15px' }}>
              <span className="stop-num">{feito ? '✓' : idx + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, cursor: 'pointer' }} onClick={() => nav(`/clientes/${c?.id}`)}>{c?.razao_social}</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                  {[c?.contato_nome, [c?.cidade, c?.estado].filter(Boolean).join('/'), dist != null && isFinite(dist) ? `${Math.round(dist)} km` : null].filter(Boolean).join(' · ')}
                  {feito && ` · check-in ${horaBR(p.checkin_em)}`}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                  {!feito && <button className="btn sm" disabled={busy === p.id} onClick={() => checkin(p)}>{busy === p.id ? 'Localizando…' : 'Cheguei'}</button>}
                  {!feito && <a className="btn ghost sm" href={rotaUrl(c || {})} target="_blank" rel="noreferrer">Rota</a>}
                  <button className="btn ghost sm" onClick={() => nav(`/clientes/${c?.id}?preparar=1`)}>Preparar visita</button>
                  {feito && <button className="btn sm" onClick={() => nav(`/clientes/${c?.id}/visita?rota=1`)}>Registrar visita</button>}
                  <button className="btn danger sm" onClick={() => remover(p)}>tirar</button>
                </div>
              </div>
            </div>
          )
        })
      )}

      {addOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAddOpen(false)}>
          <div className="modal">
            <h3 style={{ marginBottom: 10 }}>Adicionar à rota</h3>
            <input className="input" placeholder="Buscar cliente ou cidade…" value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus />
            <div style={{ maxHeight: '48vh', overflowY: 'auto', marginTop: 10 }}>
              {achados.length === 0 ? <div className="empty">Nenhum cliente encontrado.</div> : achados.map((c) => (
                <button className="row" key={c.id} onClick={() => add(c)} style={{ marginBottom: 8 }}>
                  <div className="grow">
                    <div className="l1">{c.razao_social}</div>
                    <div className="l2">{[c.cidade, c.estado].filter(Boolean).join('/') || '—'}</div>
                  </div>
                </button>
              ))}
            </div>
            <button className="btn ghost" style={{ marginTop: 10, width: '100%' }} onClick={() => setAddOpen(false)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  )
}
