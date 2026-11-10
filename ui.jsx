import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useApp } from '../lib/ctx'
import { supabase } from '../lib/supabase'

export const inp = 'w-full rounded-lg bg-ink border border-white/10 px-3 py-2 outline-none focus:border-gold'
export const btn = 'inline-flex items-center justify-center rounded-lg bg-gold px-5 py-2.5 font-bold text-ink hover:bg-gold/90 disabled:opacity-50'
export const btn2 = 'inline-flex items-center justify-center rounded-lg border border-gold/60 px-4 py-2 text-gold hover:bg-gold/10'
export const card = 'rounded-2xl border border-white/10 bg-charcoal p-6'
export const money = n => new Intl.NumberFormat('en', { style: 'currency', currency: import.meta.env.VITE_CURRENCY || 'USD', maximumFractionDigits: 0 }).format(n || 0)
export const Loading = () => <div className="p-16 text-center text-gold">…</div>

export const rules = {
  req: v => (v === null || v === undefined || String(v).trim() === '' ? 'required' : null),
  email: v => (/^\S+@\S+\.\S+$/.test(v || '') ? null : 'email'),
  min: n => v => ((v || '').length >= n ? null : 'short'),
}
export function validate(values, schema) {
  const e = {}
  for (const k in schema) for (const r of schema[k]) { const m = r(values[k]); if (m) { e[k] = m; break } }
  return e
}
export function Field({ label, error, children }) {
  const { t } = useApp()
  return <label className="block"><span className="mb-1 block text-sm text-white/70">{t(label)}</span>{children}
    {error && <span className="mt-1 block text-sm text-red-400">{t('err_' + error)}</span>}</label>
}
export function useRows(table, q = x => x, deps = []) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const load = () => q(supabase.from(table).select('*')).then(({ data, error }) => { setError(error); setRows(data || []) })
  useEffect(() => { load() }, deps)
  return { rows, error, reload: load }
}

export function Layout() {
  const { t, lang, setLang, session, profile } = useApp()
  const [open, setOpen] = useState(false)
  const links = [['/', 'home'], ['/services', 'services'], ['/pricing', 'pricing'], ['/portfolio', 'portfolio'], ['/about', 'about'], ['/contact', 'contact']]
  const cls = ({ isActive }) => (isActive ? 'text-gold' : 'text-white/70 hover:text-gold')
  return <div className="flex min-h-screen flex-col">
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-black tracking-widest text-gold">MR CODEX</Link>
        <nav className="hidden gap-6 md:flex">{links.map(([to, k]) => <NavLink key={to} to={to} end className={cls}>{t(k)}</NavLink>)}</nav>
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="rounded border border-white/20 px-2 py-1 text-sm">{lang === 'ar' ? 'EN' : 'عربي'}</button>
          {session
            ? <><Link className={btn2 + ' !py-1'} to={profile?.role === 'admin' ? '/admin' : '/portal'}>{t(profile?.role === 'admin' ? 'admin' : 'portal')}</Link>
                <button className="text-sm text-white/60 hover:text-gold" onClick={() => supabase.auth.signOut()}>{t('logout')}</button></>
            : <Link className={btn + ' !py-1.5'} to="/login">{t('login')}</Link>}
          <button className="text-2xl md:hidden" onClick={() => setOpen(!open)} aria-label="menu">☰</button>
        </div>
      </div>
      {open && <nav onClick={() => setOpen(false)} className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 md:hidden">
        {links.map(([to, k]) => <NavLink key={to} to={to} end className={cls}>{t(k)}</NavLink>)}</nav>}
    </header>
    <main className="flex-1"><Outlet /></main>
    <footer className="border-t border-white/10 py-6 text-center text-sm text-white/50">© {new Date().getFullYear()} MR CODEX — {t('rights')}</footer>
  </div>
}
