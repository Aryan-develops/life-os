import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, CheckCircle2, Circle, Target } from 'lucide-react'

const empty = { title: '', type: 'short', target_date: '', progress_pct: 0, status: 'active', notes: '' }

export default function Goals() {
  const [goals, setGoals] = useState([])
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    const { data } = await supabase.from('goals').select('*').order('created_at', { ascending: false })
    setGoals(data || [])
  }

  useEffect(() => { load() }, [])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('goals').insert([{ ...form, progress_pct: parseInt(form.progress_pct) || 0 }])
    setForm(empty)
    setShowForm(false)
    await load()
    setSaving(false)
  }

  async function updateProgress(id, pct) {
    await supabase.from('goals').update({ progress_pct: pct, status: pct >= 100 ? 'completed' : 'active' }).eq('id', id)
    await load()
  }

  async function toggleStatus(goal) {
    const status = goal.status === 'completed' ? 'active' : 'completed'
    await supabase.from('goals').update({ status, progress_pct: status === 'completed' ? 100 : goal.progress_pct }).eq('id', goal.id)
    await load()
  }

  const short = goals.filter(g => g.type === 'short')
  const long = goals.filter(g => g.type === 'long')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Goals</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#4f46e5' }}>
          <Plus size={14} /> New Goal
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="card p-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-slate-500 mb-1 block">Goal Title</label>
              <input type="text" placeholder="What do you want to achieve?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="short">Short-term</option>
                <option value="long">Long-term</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Target Date</label>
              <input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Initial Progress (%)</label>
              <input type="number" min="0" max="100" value={form.progress_pct} onChange={e => setForm(f => ({ ...f, progress_pct: e.target.value }))} />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-slate-500 mb-1 block">Notes</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="resize-none" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-lg text-white font-medium" style={{ background: '#4f46e5' }}>
            {saving ? 'Saving...' : 'Add Goal'}
          </button>
        </form>
      )}

      {[{ label: 'Long-term Goals', items: long, color: '#818cf8' }, { label: 'Short-term Goals', items: short, color: '#34d399' }].map(({ label, items, color }) => (
        <div key={label}>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{label}</h2>
          <div className="space-y-3">
            {items.length === 0 && <p className="text-slate-600 text-sm">No goals yet.</p>}
            {items.map(goal => (
              <div key={goal.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleStatus(goal)} className="mt-0.5 shrink-0 text-slate-500 hover:text-green-400 transition-colors">
                      {goal.status === 'completed' ? <CheckCircle2 size={18} className="text-green-400" /> : <Circle size={18} />}
                    </button>
                    <div>
                      <div className={`text-sm font-medium ${goal.status === 'completed' ? 'line-through text-slate-500' : 'text-white'}`}>{goal.title}</div>
                      {goal.target_date && (
                        <div className="text-xs text-slate-600 mt-0.5">{daysLeft(goal.target_date)}</div>
                      )}
                      {goal.notes && <div className="text-xs text-slate-600 mt-1">{goal.notes}</div>}
                    </div>
                  </div>
                  <span className="text-xs font-bold shrink-0" style={{ color }}>{goal.progress_pct}%</span>
                </div>
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full" style={{ background: '#1e1e2e' }}>
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${goal.progress_pct}%`, background: color }} />
                  </div>
                  <input
                    type="range" min="0" max="100" value={goal.progress_pct}
                    onChange={e => updateProgress(goal.id, parseInt(e.target.value))}
                    className="w-full h-1 appearance-none cursor-pointer"
                    style={{ accentColor: color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function daysLeft(dateStr) {
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  if (diff < 0) return `${Math.abs(diff)} days overdue`
  if (diff === 0) return 'Due today'
  return `${diff} days left`
}
