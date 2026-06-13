import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { parseAppleHealthXML } from '../lib/appleHealth'
import { Upload, Moon, Plus } from 'lucide-react'

const empty = { date: '', bedtime: '', wake_time: '', duration_hr: '', quality: '', notes: '' }

export default function Sleep() {
  const [logs, setLogs] = useState([])
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  async function load() {
    const { data } = await supabase.from('sleep_logs').select('*').order('date', { ascending: false }).limit(30)
    setLogs(data || [])
  }
  useEffect(() => { load() }, [])

  async function save(e) {
    e.preventDefault(); setSaving(true)
    const bedH = toHour(form.bedtime), wakeH = toHour(form.wake_time)
    const dur = form.duration_hr || calcDur(form.bedtime, form.wake_time)
    await supabase.from('sleep_logs').insert([{ ...form, duration_hr: parseFloat(dur)||null, quality: parseInt(form.quality)||null, sleep_hour: bedH, wake_hour: wakeH, source: 'manual' }])
    setForm(empty); setShowForm(false); await load(); setSaving(false)
  }

  async function importAH(e) {
    const file = e.target.files[0]; if (!file) return
    setImporting(true); setImportMsg('Parsing Apple Health export...')
    try {
      const { sleepLogs } = await parseAppleHealthXML(file)
      if (sleepLogs.length) {
        await supabase.from('sleep_logs').upsert(sleepLogs, { onConflict: 'date,source' })
        await load(); setImportMsg(`✓ Imported ${sleepLogs.length} sleep records`)
      } else { setImportMsg('No sleep records found in export') }
    } catch { setImportMsg("Error parsing file. Make sure it's the export.xml from Apple Health") }
    setImporting(false)
  }

  const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null
  const avgDur = avg(logs.map(l=>l.duration_hr).filter(Boolean))
  const avgQual = avg(logs.map(l=>l.quality).filter(Boolean))
  const chartData = [...logs].reverse().map(l => ({ date: l.date?.slice(5), hrs: l.duration_hr, q: l.quality }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Moon size={17} color="#a78bfa" />
          </div>
          <h1 className="page-title">Sleep</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="btn btn-ghost" style={{ cursor: 'pointer', position: 'relative' }}>
            {importing ? '⟳ Importing...' : <><Upload size={13} /> Apple Health</>}
            <input type="file" accept=".xml" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={importAH} disabled={importing} />
          </label>
          <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
            <Plus size={13} /> Log Sleep
          </button>
        </div>
      </div>

      {importMsg && (
        <div style={{ background: importMsg.startsWith('✓') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${importMsg.startsWith('✓') ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 12, padding: '12px 16px', fontSize: 13, color: importMsg.startsWith('✓') ? '#4ade80' : '#fca5a5' }}>
          {importMsg}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Avg Duration', value: avgDur ? `${avgDur.toFixed(1)}h` : '—', color: '#a78bfa' },
          { label: 'Avg Quality', value: avgQual ? `${avgQual.toFixed(1)}/10` : '—', color: '#34d399' },
          { label: 'Logs', value: logs.length, color: '#60a5fa' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '18px 20px' }}>
            <div className="section-title" style={{ marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Log form */}
      {showForm && (
        <form onSubmit={save} className="card animate-fade-in" style={{ padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 18 }}>Log Sleep Entry</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
            <div><label className="label">Date</label><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} required /></div>
            <div><label className="label">Bedtime</label><input type="time" value={form.bedtime} onChange={e=>setForm(f=>({...f,bedtime:e.target.value}))} required /></div>
            <div><label className="label">Wake Time</label><input type="time" value={form.wake_time} onChange={e=>setForm(f=>({...f,wake_time:e.target.value}))} required /></div>
            <div><label className="label">Duration (hrs)</label><input type="number" step="0.1" placeholder={form.bedtime&&form.wake_time?calcDur(form.bedtime,form.wake_time):'Auto'} value={form.duration_hr} onChange={e=>setForm(f=>({...f,duration_hr:e.target.value}))} /></div>
            <div><label className="label">Quality (1–10)</label><input type="number" min="1" max="10" value={form.quality} onChange={e=>setForm(f=>({...f,quality:e.target.value}))} required /></div>
            <div><label className="label">Notes</label><input type="text" placeholder="How did you feel?" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving...' : 'Save Entry'}</button>
            <button type="button" className="btn btn-ghost" onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 18 }}>Sleep History</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{fill:'#2d3748',fontSize:10}} axisLine={false} tickLine={false} interval={2}/>
              <YAxis tick={{fill:'#2d3748',fontSize:10}} axisLine={false} tickLine={false} domain={[0,12]}/>
              <Tooltip contentStyle={{background:'#0e0e1a',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,fontSize:12}} labelStyle={{color:'#94a3b8'}} itemStyle={{color:'#a78bfa'}} formatter={v=>[`${v}h`,'Sleep']}/>
              <Area type="monotone" dataKey="hrs" stroke="#a78bfa" strokeWidth={2} fill="url(#sg)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Log table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13, fontWeight: 700, color: '#fff' }}>
          Recent Entries <span style={{ fontSize: 11, color: '#3d4560', fontWeight: 500, marginLeft: 8 }}>{logs.length} total</span>
        </div>
        {logs.length === 0 && (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: '#3d4560', fontSize: 13 }}>No sleep logged yet. Import Apple Health data or log manually.</div>
        )}
        {logs.slice(0,15).map(log => (
          <div key={log.id} className="table-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${qualColor(log.quality)}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Moon size={15} color={qualColor(log.quality)} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{log.date}</div>
                <div style={{ fontSize: 11, color: '#3d4560', marginTop: 2 }}>{log.bedtime} → {log.wake_time}{log.source==='apple_health'?' · Apple Health':''}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#a78bfa' }}>{log.duration_hr}h</span>
              {log.quality && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#3d4560', marginBottom: 2 }}>Quality</div>
                  <span className="badge" style={{ background: `${qualColor(log.quality)}18`, color: qualColor(log.quality) }}>
                    {log.quality}/10
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function toHour(t) { if(!t)return null; const[h,m]=t.split(':').map(Number); return h+m/60 }
function calcDur(bed,wake) { if(!bed||!wake)return ''; let b=toHour(bed),w=toHour(wake); if(w<b)w+=24; return(w-b).toFixed(1) }
function qualColor(q) { if(q>=8)return '#22c55e'; if(q>=6)return '#fbbf24'; return '#ef4444' }
