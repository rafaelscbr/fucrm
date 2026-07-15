import { useRef, useState } from 'react'

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><line x1="12" y1="18" x2="12" y2="21" />
    </svg>
  )
}

export default function VoiceButton({ onResult }) {
  const [rec, setRec] = useState(false)
  const ref = useRef(null)
  if (!SR) return null

  function toggle() {
    if (rec) { ref.current?.stop(); return }
    const r = new SR()
    r.lang = 'pt-BR'; r.continuous = true; r.interimResults = true
    let finalText = ''
    r.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      onResult((finalText + interim).trim())
    }
    r.onend = () => setRec(false)
    r.onerror = () => setRec(false)
    ref.current = r; r.start(); setRec(true)
  }

  return (
    <button type="button" className={'voice-btn' + (rec ? ' on' : '')} onClick={toggle}
      aria-label={rec ? 'Parar ditado por voz' : 'Ditar por voz'}>
      <MicIcon />{rec ? 'Ouvindo… toque para parar' : 'Falar'}
    </button>
  )
}
