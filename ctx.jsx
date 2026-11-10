import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { dict } from './dict'
const C = createContext()
export const useApp = () => useContext(C)
export function Provider({ children }) {
  const [lang, setLang] = useState(localStorage.lang || 'ar')
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    localStorage.lang = lang
  }, [lang])
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (session === undefined) return
    if (!session) { setProfile(null); setReady(true); return }
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data }) => { setProfile(data); setReady(true) })
  }, [session])
  const t = k => dict[lang][k] ?? dict.en[k] ?? k
  const L = (o, k) => (o && (o[`${k}_${lang}`] || o[`${k}_ar`])) || ''
  return <C.Provider value={{ lang, setLang, t, L, session, profile, ready, user: session?.user }}>{children}</C.Provider>
}
