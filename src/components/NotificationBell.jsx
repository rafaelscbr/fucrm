import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { tempoRel } from '../lib/format'
import Icon from './Icon'

export default function NotificationBell() {
  const { session } = useAuth()
  const nav = useNavigate()
  const [itens, setItens] = useState([])
  const [aberto, setAberto] = useState(false)
  const boxRef = useRef(null)
  const uid = session?.user?.id

  async function load() {
    if (!uid) return
    const { data } = await supabase.from('notificacoes')
      .select('id, texto, orcamento_id, lida, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20)
    setItens(data || [])
  }

  useEffect(() => {
    if (!uid) return
    load()
    const ch = supabase.channel('notif-' + uid)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notificacoes', filter: `user_id=eq.${uid}` },
        () => { load(); if (navigator.vibrate) navigator.vibrate(30) })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [uid])

  useEffect(() => {
    function fora(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setAberto(false) }
    if (aberto) document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  const naoLidas = itens.filter((n) => !n.lida).length

  async function abrir() {
    const proximo = !aberto
    setAberto(proximo)
    if (proximo && naoLidas > 0) {
      const ids = itens.filter((n) => !n.lida).map((n) => n.id)
      setItens((arr) => arr.map((n) => ({ ...n, lida: true })))
      await supabase.from('notificacoes').update({ lida: true }).in('id', ids)
    }
  }

  function irPara(n) {
    setAberto(false)
    if (n.orcamento_id) nav(`/orcamentos/${n.orcamento_id}`)
  }

  if (!uid) return null

  return (
    <div className="notif" ref={boxRef}>
      <button className="icon-btn notif-btn" onClick={abrir} aria-label="Notificações" title="Notificações">
        <Icon name="sino" size={19} />
        {naoLidas > 0 && <span className="notif-badge">{naoLidas > 9 ? '9+' : naoLidas}</span>}
      </button>
      {aberto && (
        <div className="notif-pop">
          <div className="notif-head">Notificações</div>
          {itens.length === 0 ? (
            <div className="notif-empty">Nada por aqui ainda.</div>
          ) : (
            itens.map((n) => (
              <button key={n.id} className={'notif-item' + (n.orcamento_id ? '' : ' plain')} onClick={() => irPara(n)}>
                <span className="notif-txt">{n.texto}</span>
                <span className="notif-time">{tempoRel(n.created_at)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
