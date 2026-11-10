import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/ctx'
import { supabase } from '../lib/supabase'
import { btn, card, inp, Field, rules, validate } from '../components/ui'

export default function Auth({ mode = 'login', admin }) {
  const { t, session, profile } = useApp(); const nav = useNavigate()
  const reg = mode === 'register' && !admin
  const [v, setV] = useState({ full_name: '', email: '', password: '' })
  const [e, setE] = useState({}); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (session && profile && (!admin || profile.role === 'admin')) nav(profile.role === 'admin' ? '/admin' : '/portal', { replace: true })
  }, [session, profile])
  const set = k => ev => setV({ ...v, [k]: ev.target.value })
  const submit = async ev => {
    ev.preventDefault()
    const schema = { email: [rules.req, rules.email], password: [rules.req, rules.min(8)] }
    if (reg) schema.full_name = [rules.req, rules.min(2)]
    const er = validate(v, schema); setE(er); if (Object.keys(er).length) return
    setBusy(true); setMsg('')
    if (reg) {
      const { data, error } = await supabase.auth.signUp({ email: v.email, password: v.password, options: { data: { full_name: v.full_name } } })
      setMsg(error ? error.message : data.session ? '' : t('check_email'))
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password })
      if (error) setMsg(error.message)
      else if (admin) {
        const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
        if (p?.role !== 'admin') { await supabase.auth.signOut(); setMsg(t('not_admin')) }
      }
    }
    setBusy(false)
  }
  return <section className="mx-auto max-w-md px-4 py-16">
    <form onSubmit={submit} noValidate className={card + ' space-y-4'}>
      <h1 className="text-2xl font-black text-gold">{admin ? t('admin_login') : t(reg ? 'register' : 'login')}</h1>
      {reg && <Field label="full_name" error={e.full_name}><input className={inp} value={v.full_name} onChange={set('full_name')} autoComplete="name" /></Field>}
      <Field label="email" error={e.email}><input type="email" className={inp} value={v.email} onChange={set('email')} autoComplete="email" /></Field>
      <Field label="password" error={e.password}><input type="password" className={inp} value={v.password} onChange={set('password')} autoComplete={reg ? 'new-password' : 'current-password'} /></Field>
      <button className={btn + ' w-full'} disabled={busy}>{t(reg ? 'register' : 'login')}</button>
      {msg && <p className="text-center text-sm text-gold" role="alert">{msg}</p>}
      {!admin && <p className="text-center text-sm text-white/60">{t(reg ? 'have_acct' : 'no_acct')} <Link className="text-gold" to={reg ? '/login' : '/register'}>{t(reg ? 'login' : 'register')}</Link></p>}
    </form>
  </section>
}
