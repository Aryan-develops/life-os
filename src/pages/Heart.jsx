import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const empty = { date: '', resting_hr: '', hrv: '', vo2max: '', notes: '' }

export default function Heart() {
  const [logs, setLogs] = useState([])
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('heart_metrics').select('*').order('date', { ascending: false }).limit(30)
    setLogs(data || [])
  }

  useEffect(() => { load() }, [])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('heart_metrics').insert([{
      ...form,
      resting_hr: parseFloat(form.resting_hr) || null,
      hrv: parseFloat(form.hrv) || null,
      vo2max: parseFloat(form.vo2max) || null,
      source: 'manual',
    }])
    setForm(empty)
    await load()
    setSaving(false)
  }

  const chartData = [...logs].reverse().map(l => ({ date: l.date?.slice(5), hr: l.resting_hr, hrv: l.hrv }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Heart Metrics</h1>

      <form onSubmit={save} className="card p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Date</label>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Resting HR (bpm)</label>
          <input type="number" placeholder="62" value={form.resting_hr} onChange={e => setForm(f => ({ ...f, resting_hr: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">HRV (ms)</label>
          <input type="number" placeholder="55" value={form.hrv} onChange={e => setForm(f => ({ ...f, hrv: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">VO2 Max</label>
          <input type="number" step="0.1" placeholder="48" value={form.vo2max} onChange={e => setForm(f => ({ ...f, vo2max: e.target.value }))} />
        </div>
        <div className="col-span-2 md:col-span-4">
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-lg text-white font-medium" style={{ background: '#ef4444' }}>
            {saving ? 'Saving...' : 'Log Metrics'}
          </button>
        </div>
      </form>

      {chartData.length > 0 && (
        <div className="card p-5">
          <div className="text-sm font-medium text-slate-400 mb-4">Trends</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8 }} labelStyle={{ color: '#94a3b8' }} />
              <Legend />
              <Line type="monotone" dataKey="hr" stroke="#f87171" strokeWidth={2} dot={false} name="Resting HR" />
              <Line type="monotone" dataKey="hrv" stroke="#818cf8" strokeWidth={2} dot={false} name="HRV" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/50">
          <span className="text-sm font-medium text-slate-400">Log</span>
        </div>
        {logs.slice(0, 10).map(log => (
          <div key={log.id} className="px-5 py-3.5 flex items-center justify-between border-b border-slate-800/30 last:border-0">
            <span className="text-sm text-white">{log.date}</span>
            <div className="flex gap-5 text-sm">
              {log.resting_hr && <span className="text-red-400">{log.resting_hr} bpm</span>}
              {log.hrv && <span className="text-indigo-400">HRV {log.hrv} ms</span>}
              {log.vo2max && <span className="text-green-400">VO2 {log.vo2max}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
