import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../lib/ctx'
import { supabase } from '../lib/supabase'
import { btn, btn2, card, inp, money, Field, Loading, rules, validate, useRows } from '../components/ui'

const Wrap = ({ title, children }) => <section className="mx-auto max-w-6xl px-4 py-14">
  {title && <h1 className="mb-8 text-3xl font-black text-gold">{title}</h1>}{children}</section>

function ServiceCards({ limit, price }) {
  const { t, L } = useApp()
  const { rows } = useRows('services', q => q.eq('active', true).order('price').limit(limit || 50), [])
  if (!rows) return <Loading />
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{rows.map(s =>
    <div key={s.id} className={card + ' transition hover:border-gold/60'}>
      <h3 className="text-xl font-bold">{L(s, 'title')}</h3>
      <p className="mt-2 text-white/70">{L(s, 'desc')}</p>
      {price && <p className="mt-4 text-2xl font-black text-gold">{t('from')} {money(s.price)}</p>}
      {price && <Link to={`/request?service=${s.id}`} className={btn + ' mt-5'}>{t('start')}</Link>}
    </div>)}</div>
}

export function Home() {
  const { t, L } = useApp()
  const { rows } = useRows('portfolio', q => q.eq('published', true).limit(3), [])
  return <>
    <section className="bg-[radial-gradient(ellipse_at_top,#3a2f14_0%,#0B0B0C_65%)] px-4 py-24 text-center">
      <h1 className="mx-auto max-w-3xl text-4xl font-black leading-tight text-gold md:text-6xl">{t('hero_t')}</h1>
      <p className="mx-auto mt-5 max-w-2xl text-lg text-white/70">{t('hero_s')}</p>
      <div className="mt-8 flex justify-center gap-3"><Link to="/request" className={btn}>{t('request')}</Link><Link to="/portfolio" className={btn2}>{t('portfolio')}</Link></div>
    </section>
    <Wrap title={t('our_services')}><ServiceCards limit={3} /></Wrap>
    <Wrap title={t('our_work')}>{!rows ? <Loading /> : <div className="grid gap-5 sm:grid-cols-3">{rows.map(p =>
      <Link key={p.id} to={`/portfolio/${p.id}`} className={card + ' hover:border-gold/60'}><h3 className="font-bold">{L(p, 'title')}</h3></Link>)}</div>}</Wrap>
  </>
}
export const Services = () => { const { t } = useApp(); return <Wrap title={t('our_services')}><ServiceCards /></Wrap> }
export const Pricing = () => { const { t } = useApp(); return <Wrap title={t('plans')}><ServiceCards price /></Wrap> }

export function Portfolio() {
  const { t, L } = useApp()
  const { rows } = useRows('portfolio', q => q.eq('published', true).order('created_at', { ascending: false }), [])
  return <Wrap title={t('portfolio')}>{!rows ? <Loading /> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{rows.map(p =>
    <Link key={p.id} to={`/portfolio/${p.id}`} className={card + ' overflow-hidden !p-0 hover:border-gold/60'}>
      <div className="aspect-video bg-gradient-to-br from-gold/20 to-ink">{p.image_url && <img src={p.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />}</div>
      <div className="p-5"><h3 className="font-bold">{L(p, 'title')}</h3><p className="mt-1 line-clamp-2 text-sm text-white/60">{L(p, 'desc')}</p></div></Link>)}</div>}</Wrap>
}
export function ProjectDetails() {
  const { id } = useParams(); const { t, L } = useApp()
  const { rows } = useRows('portfolio', q => q.eq('id', id).eq('published', true), [id])
  if (!rows) return <Loading />
  const p = rows[0]
  if (!p) return <Wrap><p>{t('no_data')}</p><Link className={btn2} to="/portfolio">{t('back')}</Link></Wrap>
  return <Wrap title={L(p, 'title')}>
    {p.image_url && <img src={p.image_url} alt="" className="mb-6 w-full rounded-2xl" />}
    <p className="max-w-3xl text-lg text-white/80">{L(p, 'desc')}</p>
    <div className="mt-6 flex gap-3">{/^https?:\/\//.test(p.url || '') && <a className={btn} href={p.url} target="_blank" rel="noopener noreferrer">{t('visit')}</a>}
      <Link className={btn2} to="/portfolio">{t('back')}</Link></div></Wrap>
}
export const About = () => { const { t } = useApp(); return <Wrap title={t('about_t')}><p className="max-w-3xl text-lg leading-8 text-white/80">{t('about_p')}</p></Wrap> }

function LeadForm({ kind }) {
  const { t, L, user } = useApp()
  const [sp] = useSearchParams()
  const { rows: services } = useRows('services', q => q.eq('active', true), [])
  const [v, setV] = useState({ name: '', email: '', phone: '', details: '', budget: '', service_id: sp.get('service') || '' })
  const [err, setErr] = useState({}); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const set = k => e => setV({ ...v, [k]: e.target.value })
  const submit = async e => {
    e.preventDefault()
    const schema = { name: [rules.req, rules.min(2)], details: [rules.req, rules.min(5)] }
    if (!user) schema.email = [rules.req, rules.email]
    const er = validate(v, schema); setErr(er); if (Object.keys(er).length) return
    setBusy(true); setMsg('')
    const budget = v.budget === '' ? null : Math.max(0, Number(v.budget) || 0)
    const { error } = user && kind === 'request'
      ? await supabase.from('orders').insert({ customer_id: user.id, service_id: v.service_id || null, title: v.name, details: v.details, budget })
      : await supabase.from('leads').insert({ kind, name: v.name, email: v.email || user?.email, phone: v.phone || null, details: v.details, budget })
    setBusy(false)
    if (error) setMsg(error.message); else { setMsg(t('sent')); setV({ ...v, name: '', details: '', budget: '' }) }
  }
  return <form onSubmit={submit} noValidate className={card + ' mx-auto max-w-xl space-y-4'}>
    <Field label="name" error={err.name}><input className={inp} value={v.name} onChange={set('name')} maxLength={120} /></Field>
    {!user && <Field label="email" error={err.email}><input type="email" className={inp} value={v.email} onChange={set('email')} /></Field>}
    <Field label="phone"><input className={inp} value={v.phone} onChange={set('phone')} maxLength={30} /></Field>
    {kind === 'request' && <>
      <Field label="service"><select className={inp} value={v.service_id} onChange={set('service_id')}><option value="">—</option>
        {(services || []).map(s => <option key={s.id} value={s.id}>{L(s, 'title')}</option>)}</select></Field>
      <Field label="budget"><input type="number" min="0" className={inp} value={v.budget} onChange={set('budget')} /></Field></>}
    <Field label="details" error={err.details}><textarea rows="5" className={inp} value={v.details} onChange={set('details')} maxLength={4000} /></Field>
    <button className={btn + ' w-full'} disabled={busy}>{t('send')}</button>
    {msg && <p className="text-center text-gold" role="status">{msg}</p>}
  </form>
}
export const Contact = () => { const { t } = useApp(); return <Wrap title={t('contact_t')}><LeadForm kind="contact" /></Wrap> }
export const Request = () => { const { t } = useApp(); return <Wrap title={t('request_t')}><LeadForm kind="request" /></Wrap> }
