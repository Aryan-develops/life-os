import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { parseAppleHealthXML } from '../lib/appleHealth'
import { Upload } from 'lucide-react'

const empty = { date: '', bedtime: '', wake_time: '', duration_hr: '', quality: '', notes: '' }

export default function Sleep() {
  const [logs, setLogs] = useState([])
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('sleep_logs').select('*').order('date', { ascending: false }).limit(30)
    setLogs(data || [])
  }

  useEffect(() => { load() }, [])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    const bedH = parseTimeToHour(form.bedtime)
    const wakeH = parseTimeToHour(form.wake_time)
    const dur = form.duration_hr || calcDuration(form.bedtime, form.wake_time)
    await supabase.from('sleep_logs').insert([{
      ...form,
      duration_hr: parseFloat(dur) || null,
      quality: parseInt(form.quality) || null,
      sleep_hour: bedH,
      wake_hour: wakeH,
      source: 'manual',
    }])
    setForm(empty)
    await load()
    setSaving(false)
  }

  async function importAppleHealth(e) {
    const file = e.target.files[0]
    if (!file) return
    const { sleepLogs } = await parseAppleHealthXML(file)
    if (sleepLogs.length) {
      await supabase.from('sleep_logs').upsert(sleepLogs, { onConflict: 'date,source' })
      await load()
      alert(`Imported ${sleepLogs.length} sleep records from Apple Health`)
    }
  }

  const chartData = [...logs].reverse().map(l => ({
    date: l.date?.slice(5),
    duration: l.duration_hr,
    quality: l.quality,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Sleep</h1>
        <label className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 cursor-pointer" style={{ background: '#1e1e2e' }}>
          <Upload size={14} />
          Import Apple Health
          <input type="file" accept=".xml" className="hidden" onChange={importAppleHealth} />
        </label>
      </div>

      <form onSubmit={save} className="card p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Date</label>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Bedtime</label>
          <input type="time" value={form.bedtime} onChange={e => setForm(f => ({ ...f, bedtime: e.target.value }))} required />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Wake Time</label>
          <input type="time" value={form.wake_time} onChange={e => setForm(f => ({ ...f, wake_time: e.target.value }))} required />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Duration (hrs)</label>
          <input type="number" step="0.1" placeholder="Auto-calculated" value={form.duration_hr} onChange={e => setForm(f => ({ ...f, duration_hr: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Quality (1–10)</label>
          <input type="number" min="1" max="10" value={form.quality} onChange={e => setForm(f => ({ ...f, quality: e.target.value }))} required />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Notes</label>
          <input type="text" placeholder="Any notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="col-span-2 md:col-span-3">
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-lg text-white font-medium" style={{ background: '#4f46e5' }}>
            {saving ? 'Saving...' : 'Log Sleep'}
          </button>
        </div>
      </form>

      {chartData.length > 0 && (
        <div className="card p-5">
          <div className="text-sm font-medium text-slate-400 mb-4">Last 30 Nights</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 12]} />
              <Tooltip contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8 }} labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#818cf8' }} />
              <Area type="monotone" dataKey="duration" stroke="#6366f1" strokeWidth={2} fill="url(#sleepGrad)" name="Hours" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/50">
          <span className="text-sm font-medium text-slate-400">Recent Logs</span>
        </div>
        {logs.slice(0, 10).map(log => (
          <div key={log.id} className="px-5 py-3.5 flex items-center justify-between border-b border-slate-800/30 last:border-0">
            <div>
              <span className="text-sm text-white">{log.date}</span>
              <span className="text-xs text-slate-500 ml-3">{log.bedtime} → {log.wake_time}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-indigo-300">{log.duration_hr}h</span>
              {log.quality && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: qualityColor(log.quality) + '22', color: qualityColor(log.quality) }}>Q{log.quality}</span>}
              {log.source === 'apple_health' && <span className="text-xs text-slate-600">Apple Health</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function parseTimeToHour(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h + m / 60
}

function calcDuration(bed, wake) {
  if (!bed || !wake) return ''
  let b = parseTimeToHour(bed), w = parseTimeToHour(wake)
  if (w < b) w += 24
  return (w - b).toFixed(1)
}

function qualityColor(q) {
  if (q >= 8) return '#34d399'
  if (q >= 6) return '#fbbf24'
  return '#f87171'
}
