import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { useApp } from '../lib/ctx'
import { supabase } from '../lib/supabase'
import { btn, card, inp, money, Field, Loading, rules, validate, useRows } from '../components/ui'

const Empty = () => { const { t } = useApp(); return <p className="text-white/50">{t('no_data')}</p> }
const Badge = ({ s }) => { const { t } = useApp(); return <span className="rounded-full bg-gold/15 px-3 py-0.5 text-sm text-gold">{t(s)}</span> }
const date = d => new Date(d).toLocaleDateString()

export default function Portal() {
  const { t } = useApp()
  const tabs = [['/portal', 'dashboard'], ['/portal/orders', 'orders'], ['/portal/messages', 'messages'], ['/portal/invoices', 'invoices']]
  return <div className="mx-auto max-w-6xl px-4 py-8">
    <nav className="mb-6 flex gap-2 overflow-x-auto">{tabs.map(([to, k]) => <NavLink key={to} to={to} end
      className={({ isActive }) => `whitespace-nowrap rounded-lg px-4 py-2 ${isActive ? 'bg-gold text-ink font-bold' : 'bg-charcoal text-white/70'}`}>{t(k)}</NavLink>)}</nav>
    <Routes><Route index element={<Dash />} /><Route path="orders" element={<Orders />} />
      <Route path="messages" element={<Messages />} /><Route path="invoices" element={<Invoices />} /></Routes>
  </div>
}
export function Dash() {
  const { t, profile } = useApp()
  const { rows } = useRows('projects', q => q.order('created_at', { ascending: false }), [])
  if (!rows) return <Loading />
  return <div><h2 className="mb-5 text-2xl font-black">{profile?.full_name}</h2>
    <h3 className="mb-3 text-gold">{t('my_projects')}</h3>
    {!rows.length ? <Empty /> : <div className="grid gap-4 md:grid-cols-2">{rows.map(p => <div key={p.id} className={card}>
      <div className="flex items-center justify-between"><b>{p.name}</b><Badge s={p.status} /></div>
      <div className="mt-4 h-2 overflow-hidden rounded bg-white/10"><div className="h-full bg-gold" style={{ width: `${p.progress}%` }} /></div>
      <p className="mt-2 text-sm text-white/60">{t('progress')}: {p.progress}%</p></div>)}</div>}</div>
}
function Orders() {
  const { t, L, user } = useApp()
  const { rows, reload } = useRows('orders', q => q.order('created_at', { ascending: false }), [])
  const { rows: services } = useRows('services', q => q.eq('active', true), [])
  const [v, setV] = useState({ title: '', service_id: '', budget: '', details: '' }); const [e, setE] = useState({}); const [msg, setMsg] = useState('')
  const set = k => ev => setV({ ...v, [k]: ev.target.value })
  const submit = async ev => {
    ev.preventDefault()
    const er = validate(v, { title: [rules.req, rules.min(2)] }); setE(er); if (Object.keys(er).length) return
    const { error } = await supabase.from('orders').insert({ customer_id: user.id, title: v.title, details: v.details, service_id: v.service_id || null, budget: v.budget === '' ? null : Math.max(0, Number(v.budget)) })
    if (error) setMsg(error.message); else { setMsg(''); setV({ title: '', service_id: '', budget: '', details: '' }); reload() }
  }
  return <div className="grid gap-6 lg:grid-cols-2">
    <form onSubmit={submit} noValidate className={card + ' space-y-3'}><h3 className="text-gold">{t('new_order')}</h3>
      <Field label="title" error={e.title}><input className={inp} value={v.title} onChange={set('title')} maxLength={160} /></Field>
      <Field label="service"><select className={inp} value={v.service_id} onChange={set('service_id')}><option value="">—</option>{(services || []).map(s => <option key={s.id} value={s.id}>{L(s, 'title')}</option>)}</select></Field>
      <Field label="budget"><input type="number" min="0" className={inp} value={v.budget} onChange={set('budget')} /></Field>
      <Field label="details"><textarea rows="3" className={inp} value={v.details} onChange={set('details')} maxLength={4000} /></Field>
      <button className={btn}>{t('send')}</button>{msg && <p className="text-red-400">{msg}</p>}</form>
    <div className="space-y-3">{!rows ? <Loading /> : !rows.length ? <Empty /> : rows.map(o => <div key={o.id} className={card + ' !p-4'}>
      <div className="flex justify-between"><b>{o.title}</b><Badge s={o.status} /></div><p className="text-sm text-white/50">{date(o.created_at)}</p></div>)}</div></div>
}
export function Messages() {
  const { t, user } = useApp()
  const { rows: projects } = useRows('projects', q => q.order('created_at', { ascending: false }), [])
  const [pid, setPid] = useState(''); const [msgs, setMsgs] = useState([]); const [body, setBody] = useState('')
  const load = async id => { const { data } = await supabase.from('messages').select('*').eq('project_id', id).order('created_at'); setMsgs(data || []) }
  useEffect(() => {
    if (!pid) return
    load(pid)
    const ch = supabase.channel('m' + pid).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${pid}` }, () => load(pid)).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [pid])
  const send = async ev => {
    ev.preventDefault(); const b = body.trim(); if (!b) return
    const { error } = await supabase.from('messages').insert({ project_id: pid, sender_id: user.id, body: b })
    if (!error) { setBody(''); load(pid) }
  }
  return <div className={card}>
    <select className={inp + ' mb-4'} value={pid} onChange={ev => setPid(ev.target.value)}><option value="">{t('select_project')}</option>{(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
    {pid && <><div className="mb-4 flex max-h-96 flex-col gap-2 overflow-y-auto">{msgs.map(m => <div key={m.id}
      className={`max-w-[80%] rounded-xl px-4 py-2 ${m.sender_id === user.id ? 'self-end bg-gold text-ink' : 'self-start bg-ink'}`}>{m.body}</div>)}</div>
      <form onSubmit={send} className="flex gap-2"><input className={inp} value={body} onChange={ev => setBody(ev.target.value)} placeholder={t('type_msg')} maxLength={2000} /><button className={btn}>{t('send')}</button></form></>}
  </div>
}
function Invoices() {
  const { t } = useApp()
  const { rows } = useRows('invoices', q => q.order('created_at', { ascending: false }), [])
  if (!rows) return <Loading />
  return <div><p className="mb-4 text-sm text-white/60">{t('pay_note')}</p>
    {!rows.length ? <Empty /> : <div className="overflow-x-auto"><table className={card + ' w-full !p-2 text-start'}><thead className="text-white/50"><tr>
      {['created_at', 'amount', 'due_date', 'status'].map(h => <th key={h} className="p-3 text-start">{t(h)}</th>)}</tr></thead>
      <tbody>{rows.map(i => <tr key={i.id} className="border-t border-white/10"><td className="p-3">{date(i.created_at)}</td><td className="p-3">{money(i.amount)}</td>
        <td className="p-3">{i.due_date || '—'}</td><td className="p-3"><Badge s={i.status} /></td></tr>)}</tbody></table></div>}</div>
}
