import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const empty = { date: '', type: 'income', amount: '', category: '', notes: '' }
const CATEGORIES = {
  income: ['Salary', 'Freelance', 'Investment', 'Business', 'Other'],
  expense: ['Rent', 'Food', 'Transport', 'Health', 'Entertainment', 'Subscriptions', 'Shopping', 'Other'],
}

export default function Finances() {
  const [txs, setTxs] = useState([])
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))

  async function load() {
    const { data } = await supabase.from('personal_finances').select('*').order('date', { ascending: false }).limit(100)
    setTxs(data || [])
  }

  useEffect(() => { load() }, [])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('personal_finances').insert([{ ...form, amount: parseFloat(form.amount) }])
    setForm(empty)
    await load()
    setSaving(false)
  }

  const monthTxs = txs.filter(t => t.date?.startsWith(month))
  const income = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const savings = income - expense

  // Category breakdown for expenses
  const expByCategory = Object.entries(
    monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => {
      acc[t.category || 'Other'] = (acc[t.category || 'Other'] || 0) + t.amount
      return acc
    }, {})
  ).map(([cat, amt]) => ({ cat, amt })).sort((a, b) => b.amt - a.amt)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Personal Finances</h1>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-auto px-3 py-1.5 text-sm" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">Income</div>
          <div className="text-xl font-bold text-green-400">${income.toLocaleString()}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">Expenses</div>
          <div className="text-xl font-bold text-red-400">${expense.toLocaleString()}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">Savings</div>
          <div className={`text-xl font-bold ${savings >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>${savings.toLocaleString()}</div>
        </div>
      </div>

      <form onSubmit={save} className="card p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Date</label>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Type</label>
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, category: '' }))}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Amount ($)</label>
          <input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Category</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            <option value="">Select...</option>
            {CATEGORIES[form.type].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Notes</label>
          <input type="text" placeholder="Description..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={saving} className="w-full px-4 py-2.5 rounded-lg text-white font-medium" style={{ background: '#16a34a' }}>
            {saving ? '...' : 'Add Transaction'}
          </button>
        </div>
      </form>

      {expByCategory.length > 0 && (
        <div className="card p-5">
          <div className="text-sm font-medium text-slate-400 mb-4">Expense Breakdown</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={expByCategory} layout="vertical">
              <XAxis type="number" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="cat" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8 }} labelStyle={{ color: '#94a3b8' }} formatter={v => [`$${v}`, 'Amount']} />
              <Bar dataKey="amt" radius={4}>
                {expByCategory.map((_, i) => <Cell key={i} fill={`hsl(${240 + i * 20}, 70%, 65%)`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/50">
          <span className="text-sm font-medium text-slate-400">Transactions — {month}</span>
        </div>
        {monthTxs.length === 0 && <div className="px-5 py-4 text-sm text-slate-600">No transactions this month.</div>}
        {monthTxs.map(tx => (
          <div key={tx.id} className="px-5 py-3.5 flex items-center justify-between border-b border-slate-800/30 last:border-0">
            <div>
              <span className="text-sm text-white">{tx.category || tx.notes || '—'}</span>
              {tx.notes && tx.category && <span className="text-xs text-slate-600 ml-2">{tx.notes}</span>}
              <span className="text-xs text-slate-600 ml-2">{tx.date}</span>
            </div>
            <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
              {tx.type === 'income' ? '+' : '-'}${tx.amount?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
