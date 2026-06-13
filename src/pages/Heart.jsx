import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Heart as HeartIcon, Plus } from 'lucide-react'

const empty = { date: '', resting_hr: '', hrv: '', vo2max: '', notes: '' }

export default function Heart() {
  const [logs, setLogs] = useState([])
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    const { data } = await supabase.from('heart_metrics').select('*').order('date', { ascending: false }).limit(30)
    setLogs(data || [])
  }
  useEffect(() => { load() }, [])

  async function save(e) {
    e.preventDefault(); setSaving(true)
    await supabase.from('heart_metrics').insert([{ ...form, resting_hr: parseFloat(form.resting_hr)||null, hrv: parseFloat(form.hrv)||null, vo2max: parseFloat(form.vo2max)||null, source: 'manual' }])
    setForm(empty); setShowForm(false); await load(); setSaving(false)
  }

  const latest = logs[0]
  const chartData = [...logs].reverse().map(l => ({ date: l.date?.slice(5), hr: l.resting_hr, hrv: l.hrv }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HeartIcon size={17} color="#f87171" />
          </div>
          <h1 className="page-title">Heart Metrics</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}><Plus size={13} /> Log Metrics</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Resting HR', value: latest?.resting_hr ? `${latest.resting_hr} bpm` : '—', color: '#f87171', note: hrZone(latest?.resting_hr) },
          { label: 'HRV', value: latest?.hrv ? `${latest.hrv} ms` : '—', color: '#818cf8', note: latest?.hrv ? (latest.hrv > 60 ? 'Excellent' : latest.hrv > 40 ? 'Good' : 'Low') : '' },
          { label: 'VO2 Max', value: latest?.vo2max ?? '—', color: '#34d399', note: latest?.vo2max ? 'ml/kg/min' : '' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '20px 22px' }}>
            <div className="section-title" style={{ marginBottom: 10 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-0.02em', marginBottom: 4 }}>{s.value}</div>
            {s.note && <div style={{ fontSize: 11, color: '#475569' }}>{s.note}</div>}
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={save} className="card animate-fade-in" style={{ padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 18 }}>Log Heart Metrics</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
            <div><label className="label">Date</label><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} required /></div>
            <div><label className="label">Resting HR (bpm)</label><input type="number" placeholder="62" value={form.resting_hr} onChange={e=>setForm(f=>({...f,resting_hr:e.target.value}))} /></div>
            <div><label className="label">HRV (ms)</label><input type="number" placeholder="55" value={form.hrv} onChange={e=>setForm(f=>({...f,hrv:e.target.value}))} /></div>
            <div><label className="label">VO2 Max</label><input type="number" step="0.1" placeholder="48" value={form.vo2max} onChange={e=>setForm(f=>({...f,vo2max:e.target.value}))} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn btn-red">{saving ? 'Saving...' : 'Save Metrics'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {chartData.length > 0 && (
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 18 }}>Trends</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 0, left: -20 }}>
              <XAxis dataKey="date" tick={{fill:'#2d3748',fontSize:10}} axisLine={false} tickLine={false} interval={2}/>
              <YAxis tick={{fill:'#2d3748',fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{background:'#0e0e1a',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,fontSize:12}} labelStyle={{color:'#94a3b8'}}/>
              <Line type="monotone" dataKey="hr" stroke="#f87171" strokeWidth={2} dot={false} name="Resting HR"/>
              <Line type="monotone" dataKey="hrv" stroke="#818cf8" strokeWidth={2} dot={false} name="HRV"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13, fontWeight: 700, color: '#fff' }}>Log</div>
        {logs.length === 0 && <div style={{ padding: '32px 20px', textAlign: 'center', color: '#3d4560', fontSize: 13 }}>No heart metrics yet. Log manually or import from Apple Health → Integrations.</div>}
        {logs.slice(0,12).map(log => (
          <div key={log.id} className="table-row">
            <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{log.date}</span>
            <div style={{ display: 'flex', gap: 20 }}>
              {log.resting_hr && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 10, color: '#3d4560' }}>HR</div><div style={{ fontSize: 14, fontWeight: 700, color: '#f87171' }}>{log.resting_hr} bpm</div></div>}
              {log.hrv && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 10, color: '#3d4560' }}>HRV</div><div style={{ fontSize: 14, fontWeight: 700, color: '#818cf8' }}>{log.hrv} ms</div></div>}
              {log.vo2max && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 10, color: '#3d4560' }}>VO2</div><div style={{ fontSize: 14, fontWeight: 700, color: '#34d399' }}>{log.vo2max}</div></div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function hrZone(hr) {
  if (!hr) return ''
  if (hr < 60) return 'Athletic'
  if (hr < 70) return 'Good'
  if (hr < 80) return 'Normal'
  return 'Elevated'
}
