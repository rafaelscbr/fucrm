import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthCtx = createContext(null)

async function fetchProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session?.user) setProfile(await fetchProfile(data.session.user.id))
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s)
      setProfile(s?.user ? await fetchProfile(s.user.id) : null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = {
    session,
    profile,
    loading,
    isGestor: profile?.papel === 'gestor' || profile?.papel === 'admin',
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
