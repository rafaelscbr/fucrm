import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    const { error } = await signIn(email.trim(), password)
    setLoading(false)
    if (error) setErr('E-mail ou senha incorretos.')
    else navigate('/', { replace: true })
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand">
          <span className="dot">FU</span>
          <b>FuCRM</b>
        </div>
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>Entrar</h1>
        <p className="muted" style={{ marginBottom: 20, fontSize: 14 }}>
          Representação Fuplastic · Sul
        </p>
        <form onSubmit={onSubmit}>
          {err && <div className="err">{err}</div>}
          <div className="field">
            <label>E-mail</label>
            <input className="input" type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Senha</label>
            <input className="input" type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn block" type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <p className="faint" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 10 }}>Uma iniciativa</p>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 32, fontWeight: 600, letterSpacing: '.16em', color: 'var(--text)', lineHeight: 1, paddingLeft: '.16em' }}>DE&nbsp;MARCHI</div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.4em', color: '#bb9440', marginTop: 7, paddingLeft: '.4em' }}>EMPREENDIMENTOS</div>
        </div>
      </div>
    </div>
  )
}
