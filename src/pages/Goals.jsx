import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, CheckCircle2, Circle, Target, Flag } from 'lucide-react'

const empty = { title: '', type: 'long', target_date: '', progress_pct: 0, notes: '' }

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
    e.preventDefault(); setSaving(true)
    await supabase.from('goals').insert([{ ...form, progress_pct: parseInt(form.progress_pct)||0, status: 'active' }])
    setForm(empty); setShowForm(false); await load(); setSaving(false)
  }

  async function updateProgress(id, pct) {
    await supabase.from('goals').update({ progress_pct: pct, status: pct>=100?'completed':'active' }).eq('id', id)
    setGoals(g => g.map(x => x.id===id ? {...x, progress_pct: pct, status: pct>=100?'completed':'active'} : x))
  }

  async function toggle(goal) {
    const status = goal.status==='completed' ? 'active' : 'completed'
    const pct = status==='completed' ? 100 : goal.progress_pct
    await supabase.from('goals').update({ status, progress_pct: pct }).eq('id', goal.id)
    await load()
  }

  const long = goals.filter(g=>g.type==='long')
  const short = goals.filter(g=>g.type==='short')
  const completed = goals.filter(g=>g.status==='completed').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={17} color="#60a5fa" />
          </div>
          <h1 className="page-title">Goals</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v=>!v)}><Plus size={13} /> New Goal</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Goals', value: goals.length, color: '#60a5fa' },
          { label: 'Completed', value: completed, color: '#22c55e' },
          { label: 'In Progress', value: goals.length - completed, color: '#fbbf24' },
        ].map(s=>(
          <div key={s.label} className="card" style={{ padding: '20px 22px' }}>
            <div className="section-title" style={{ marginBottom: 10 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={save} className="card animate-fade-in" style={{ padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 18 }}>New Goal</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
            <div><label className="label">Goal</label><input type="text" placeholder="What do you want to achieve?" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div><label className="label">Type</label>
                <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                  <option value="long">Long-term</option>
                  <option value="short">Short-term</option>
                </select>
              </div>
              <div><label className="label">Target Date</label><input type="date" value={form.target_date} onChange={e=>setForm(f=>({...f,target_date:e.target.value}))} /></div>
              <div><label className="label">Starting Progress (%)</label><input type="number" min="0" max="100" value={form.progress_pct} onChange={e=>setForm(f=>({...f,progress_pct:e.target.value}))} /></div>
            </div>
            <div><label className="label">Notes</label><textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any context or milestones..." /></div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving?'Saving...':'Add Goal'}</button>
            <button type="button" className="btn btn-ghost" onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {[{ label: 'Long-term Goals', items: long, color: '#818cf8' }, { label: 'Short-term Goals', items: short, color: '#34d399' }].map(({ label, items, color }) => (
        <div key={label}>
          <div className="section-title" style={{ marginBottom: 14 }}>{label} <span style={{ color: '#2d3748', fontWeight: 500, textTransform: 'none', fontSize: 12, marginLeft: 6 }}>({items.length})</span></div>
          {items.length === 0 && (
            <div className="card" style={{ padding: '24px 20px', textAlign: 'center', color: '#3d4560', fontSize: 13 }}>No {label.toLowerCase()} yet.</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(goal => (
              <div key={goal.id} className="card" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                  <button onClick={()=>toggle(goal)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 1, flexShrink: 0 }}>
                    {goal.status==='completed'
                      ? <CheckCircle2 size={20} color="#22c55e" />
                      : <Circle size={20} color="#3d4560" />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: goal.status==='completed'?'#3d4560':'#e2e8f0', textDecoration: goal.status==='completed'?'line-through':'none', marginBottom: 4 }}>
                      {goal.title}
                    </div>
                    {goal.notes && <div style={{ fontSize: 12, color: '#3d4560' }}>{goal.notes}</div>}
                    {goal.target_date && (
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Flag size={10} /> {daysLeft(goal.target_date)}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: '-0.02em', flexShrink: 0 }}>{goal.progress_pct}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${goal.progress_pct}%`, background: goal.status==='completed' ? '#22c55e' : color }} />
                </div>
                {goal.status !== 'completed' && (
                  <input type="range" min="0" max="100" value={goal.progress_pct}
                    onChange={e=>updateProgress(goal.id, parseInt(e.target.value))}
                    style={{ width:'100%', marginTop:8, accentColor: color, cursor:'pointer' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function daysLeft(dateStr) {
  const diff = Math.ceil((new Date(dateStr)-new Date())/86400000)
  if (diff < 0) return `${Math.abs(diff)} days overdue`
  if (diff === 0) return 'Due today'
  return `${diff} days left`
}
