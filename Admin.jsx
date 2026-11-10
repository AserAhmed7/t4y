import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { useApp } from '../lib/ctx'
import { supabase } from '../lib/supabase'
import { btn, btn2, card, inp, money, Field, Loading, rules, validate, useRows } from '../components/ui'
import { Messages } from './Portal'

const ST = { orders: ['new', 'reviewing', 'accepted', 'rejected'], projects: ['planning', 'design', 'development', 'review', 'launched'], invoices: ['unpaid', 'paid', 'void'] }

function Crud({ table, fields, readOnly }) {
  const { t } = useApp()
  const { rows, error, reload } = useRows(table, q => q.order('created_at', { ascending: false }), [table])
  const [form, setForm] = useState(null); const [err, setErr] = useState({}); const [msg, setMsg] = useState('')
  const show = (f, r) => {
    const val = r[f.k]
    if (f.type === 'checkbox') return val ? '✓' : '—'
    if (f.type === 'select') return f.options.find(o => o[0] === val)?.[1] ?? '—'
    if (f.k === 'amount' || (f.k === 'price')) return money(val)
    return val ?? '—'
  }
  const save = async ev => {
    ev.preventDefault()
    const schema = {}; fields.forEach(f => { if (f.req) schema[f.k] = [rules.req] })
    const er = validate(form, schema); setErr(er); if (Object.keys(er).length) return
    const { id, ...raw } = form; const v = {}
    fields.forEach(f => {
      let x = raw[f.k]
      if (f.type === 'number') x = x === '' || x == null ? null : Number(x)
      else if (f.type === 'checkbox') x = !!x
      else if (x === '') x = null
      v[f.k] = x
    })
    const { error } = id ? await supabase.from(table).update(v).eq('id', id) : await supabase.from(table).insert(v)
    if (error) setMsg(error.message); else { setMsg(''); setForm(null); reload() }
  }
  const del = async id => { if (confirm(t('confirm_del'))) { const { error } = await supabase.from(table).delete().eq('id', id); if (error) setMsg(error.message); else reload() } }
  const blank = Object.fromEntries(fields.map(f => [f.k, f.type === 'checkbox' ? true : f.def ?? '']))
  if (!rows) return <Loading />
  const cols = fields.filter(f => f.type !== 'textarea').slice(0, 5)
  return <div>
    {!readOnly && <button className={btn + ' mb-4'} onClick={() => { setForm(blank); setErr({}) }}>+ {t('add')}</button>}
    {(error || msg) && <p className="mb-3 text-red-400">{error?.message || msg}</p>}
    {form && <form onSubmit={save} noValidate className={card + ' mb-6 grid gap-3 md:grid-cols-2'}>
      {fields.map(f => <div key={f.k} className={f.type === 'textarea' ? 'md:col-span-2' : ''}><Field label={f.k} error={err[f.k]}>
        {f.type === 'textarea' ? <textarea rows="3" className={inp} value={form[f.k] ?? ''} onChange={e => setForm({ ...form, [f.k]: e.target.value })} />
          : f.type === 'select' ? <select className={inp} value={form[f.k] ?? ''} onChange={e => setForm({ ...form, [f.k]: e.target.value })}><option value="">—</option>{f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          : f.type === 'checkbox' ? <input type="checkbox" className="h-5 w-5 accent-[#D7B66A]" checked={!!form[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.checked })} />
          : <input className={inp} type={f.type || 'text'} step={f.type === 'number' ? 'any' : undefined} value={form[f.k] ?? ''} onChange={e => setForm({ ...form, [f.k]: e.target.value })} />}
      </Field></div>)}
      <div className="flex gap-2 md:col-span-2"><button className={btn}>{t('save')}</button><button type="button" className={btn2} onClick={() => setForm(null)}>{t('cancel')}</button></div>
    </form>}
    {!rows.length ? <p className="text-white/50">{t('no_data')}</p> : <div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full bg-charcoal text-sm">
      <thead className="text-white/50"><tr>{cols.map(c => <th key={c.k} className="p-3 text-start">{t(c.k)}</th>)}{!readOnly && <th />}</tr></thead>
      <tbody>{rows.map(r => <tr key={r.id} className="border-t border-white/10">
        {cols.map(c => <td key={c.k} className="max-w-[220px] truncate p-3">{c.k === 'status' ? t(r.status) : show(c, r)}</td>)}
        {!readOnly && <td className="whitespace-nowrap p-3 text-end"><button className="me-3 text-gold" onClick={() => { setForm(r); setErr({}) }}>{t('edit')}</button>
          <button className="text-red-400" onClick={() => del(r.id)}>{t('delete')}</button></td>}</tr>)}</tbody></table></div>}
  </div>
}

function Analytics() {
  const { t } = useApp(); const [d, setD] = useState(null)
  useEffect(() => {
    (async () => {
      const [cu, pr, inv, ord, le] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('projects').select('*', { count: 'exact', head: true }).neq('status', 'launched'),
        supabase.from('invoices').select('amount,status'), supabase.from('orders').select('status'),
        supabase.from('leads').select('*', { count: 'exact', head: true })])
      const sum = s => (inv.data || []).filter(i => i.status === s).reduce((a, i) => a + Number(i.amount), 0)
      const by = Object.fromEntries(ST.orders.map(s => [s, (ord.data || []).filter(o => o.status === s).length]))
      setD({ cu: cu.count, pr: pr.count, or: (ord.data || []).length, le: le.count, paid: sum('paid'), unpaid: sum('unpaid'), by })
    })()
  }, [])
  if (!d) return <Loading />
  const max = Math.max(1, ...Object.values(d.by))
  const stats = [['revenue', money(d.paid)], ['pending', money(d.unpaid)], ['total_customers', d.cu], ['active_projects', d.pr], ['total_orders', d.or], ['leads', d.le]]
  return <div><div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{stats.map(([k, v]) => <div key={k} className={card}><p className="text-sm text-white/60">{t(k)}</p><p className="mt-1 text-2xl font-black text-gold">{v}</p></div>)}</div>
    <div className={card + ' mt-6 space-y-3'}><h3 className="text-gold">{t('orders')}</h3>{Object.entries(d.by).map(([s, n]) => <div key={s} className="flex items-center gap-3">
      <span className="w-24 text-sm">{t(s)}</span><div className="h-3 flex-1 rounded bg-white/10"><div className="h-full rounded bg-gold" style={{ width: `${(n / max) * 100}%` }} /></div><span>{n}</span></div>)}</div></div>
}

export default function Admin() {
  const { t, L } = useApp()
  const { rows: cust } = useRows('profiles', q => q.eq('role', 'customer'), [])
  const { rows: projs } = useRows('projects', q => q, [])
  const { rows: svcs } = useRows('services', q => q, [])
  const co = (cust || []).map(c => [c.id, c.full_name || c.id.slice(0, 8)])
  const so = (e) => ST[e].map(s => [s, t(s)])
  const F = {
    customers: [{ k: 'full_name' }, { k: 'phone' }, { k: 'role' }, { k: 'created_at' }],
    projects: [{ k: 'name', req: 1 }, { k: 'customer_id', type: 'select', options: co, req: 1 }, { k: 'status', type: 'select', options: so('projects'), def: 'planning', req: 1 }, { k: 'progress', type: 'number', def: 0, req: 1 }],
    orders: [{ k: 'title', req: 1 }, { k: 'customer_id', type: 'select', options: co, req: 1 }, { k: 'status', type: 'select', options: so('orders'), def: 'new', req: 1 }, { k: 'budget', type: 'number' }, { k: 'details', type: 'textarea' }],
    services: [{ k: 'title_ar', req: 1 }, { k: 'title_en', req: 1 }, { k: 'price', type: 'number', def: 0, req: 1 }, { k: 'active', type: 'checkbox' }, { k: 'desc_ar', type: 'textarea' }, { k: 'desc_en', type: 'textarea' }],
    portfolio: [{ k: 'title_ar', req: 1 }, { k: 'title_en', req: 1 }, { k: 'image_url' }, { k: 'url' }, { k: 'published', type: 'checkbox' }, { k: 'desc_ar', type: 'textarea' }, { k: 'desc_en', type: 'textarea' }],
    invoices: [{ k: 'customer_id', type: 'select', options: co, req: 1 }, { k: 'project_id', type: 'select', options: (projs || []).map(p => [p.id, p.name]) }, { k: 'amount', type: 'number', req: 1 }, { k: 'status', type: 'select', options: so('invoices'), def: 'unpaid', req: 1 }, { k: 'due_date', type: 'date' }],
    leads: [{ k: 'kind' }, { k: 'name' }, { k: 'email' }, { k: 'phone' }, { k: 'details' }],
  }
  const tabs = [['', 'analytics'], ['customers', 'customers'], ['projects', 'projects'], ['orders', 'orders'], ['services', 'services'], ['portfolio', 'portfolio'], ['invoices', 'invoices'], ['messages', 'messages'], ['leads', 'leads']]
  return <div className="mx-auto max-w-6xl px-4 py-8 lg:flex lg:gap-6">
    <nav className="mb-6 flex gap-2 overflow-x-auto lg:mb-0 lg:w-48 lg:shrink-0 lg:flex-col">{tabs.map(([p, k]) => <NavLink key={k} to={`/admin/${p}`} end
      className={({ isActive }) => `whitespace-nowrap rounded-lg px-4 py-2 ${isActive ? 'bg-gold font-bold text-ink' : 'bg-charcoal text-white/70'}`}>{t(k)}</NavLink>)}</nav>
    <div className="min-w-0 flex-1"><Routes>
      <Route index element={<Analytics />} />
      <Route path="messages" element={<Messages />} />
      {Object.keys(F).map(k => <Route key={k} path={k} element={<Crud key={k} table={k === 'customers' ? 'profiles' : k} fields={F[k]} readOnly={k === 'customers' || k === 'leads'} />} />)}
    </Routes></div></div>
}
