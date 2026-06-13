import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, Dumbbell, ChevronDown, ChevronRight } from 'lucide-react'

const emptySession = { date: '', type: 'Strength', duration_min: '', notes: '', start_hour: '' }
const emptyEx = { name: '', sets: '', reps: '', weight_kg: '' }
const TYPES = ['Strength', 'Cardio', 'HIIT', 'Mobility', 'Sports', 'Other']
const TYPE_COLORS = { Strength: '#fbbf24', Cardio: '#34d399', HIIT: '#f87171', Mobility: '#818cf8', Sports: '#38bdf8', Other: '#64748b' }

export default function Fitness() {
  const [sessions, setSessions] = useState([])
  const [form, setForm] = useState(emptySession)
  const [exercises, setExercises] = useState([{ ...emptyEx }])
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    const { data } = await supabase.from('gym_sessions').select('*').order('date', { ascending: false }).limit(50)
    setSessions(data || [])
  }
  useEffect(() => { load() }, [])

  async function save(e) {
    e.preventDefault(); setSaving(true)
    const [h, m] = (form.start_hour || '').split(':').map(Number)
    const startHour = form.start_hour ? h + m/60 : null
    await supabase.from('gym_sessions').insert([{ date: form.date, type: form.type, duration_min: parseInt(form.duration_min)||null, notes: form.notes, start_hour: startHour, exercises: exercises.filter(e=>e.name) }])
    setForm(emptySession); setExercises([{...emptyEx}]); setShowForm(false); await load(); setSaving(false)
  }

  const totalVol = sessions.reduce((s, sess) => {
    return s + (sess.exercises || []).reduce((sv, ex) => sv + (ex.sets||0)*(ex.reps||0)*(ex.weight_kg||0), 0)
  }, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Dumbbell size={17} color="#fbbf24" />
          </div>
          <h1 className="page-title">Fitness</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v=>!v)}><Plus size={13} /> Log Session</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Sessions', value: sessions.length, color: '#fbbf24' },
          { label: 'This Month', value: sessions.filter(s=>s.date?.startsWith(new Date().toISOString().slice(0,7))).length, color: '#34d399' },
          { label: 'Total Volume', value: totalVol > 0 ? `${(totalVol/1000).toFixed(1)}t` : '—', color: '#818cf8' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '20px 22px' }}>
            <div className="section-title" style={{ marginBottom: 10 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={save} className="card animate-fade-in" style={{ padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 18 }}>New Session</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
            <div><label className="label">Date</label><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} required /></div>
            <div><label className="label">Type</label><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label className="label">Start Time</label><input type="time" value={form.start_hour} onChange={e=>setForm(f=>({...f,start_hour:e.target.value}))} /></div>
            <div><label className="label">Duration (min)</label><input type="number" placeholder="60" value={form.duration_min} onChange={e=>setForm(f=>({...f,duration_min:e.target.value}))} /></div>
          </div>

          {/* Exercises */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="label" style={{ margin: 0 }}>Exercises</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExercises(e=>[...e,{...emptyEx}])}><Plus size={11} /> Add Exercise</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {exercises.map((ex, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                  <input placeholder="Exercise name" value={ex.name} onChange={e=>setExercises(arr=>arr.map((x,j)=>j===i?{...x,name:e.target.value}:x))} />
                  <input placeholder="Sets" type="number" value={ex.sets} onChange={e=>setExercises(arr=>arr.map((x,j)=>j===i?{...x,sets:e.target.value}:x))} />
                  <input placeholder="Reps" type="number" value={ex.reps} onChange={e=>setExercises(arr=>arr.map((x,j)=>j===i?{...x,reps:e.target.value}:x))} />
                  <input placeholder="kg" type="number" value={ex.weight_kg} onChange={e=>setExercises(arr=>arr.map((x,j)=>j===i?{...x,weight_kg:e.target.value}:x))} />
                  {exercises.length > 1 && (
                    <button type="button" className="btn btn-ghost btn-icon" onClick={()=>setExercises(arr=>arr.filter((_,j)=>j!==i))}><Trash2 size={13} color="#ef4444" /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label className="label">Notes</label>
            <textarea rows={2} placeholder="How did it go?" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn btn-green">{saving ? 'Saving...' : 'Save Session'}</button>
            <button type="button" className="btn btn-ghost" onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13, fontWeight: 700, color: '#fff' }}>
          Sessions <span style={{ fontSize: 11, color: '#3d4560', fontWeight: 500, marginLeft: 8 }}>{sessions.length} total</span>
        </div>
        {sessions.length === 0 && <div style={{ padding: '32px 20px', textAlign: 'center', color: '#3d4560', fontSize: 13 }}>No sessions yet. Log your first workout above.</div>}
        {sessions.slice(0,20).map(session => (
          <div key={session.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <button type="button" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              onClick={() => setExpanded(expanded===session.id ? null : session.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: `${TYPE_COLORS[session.type]||'#64748b'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Dumbbell size={14} color={TYPE_COLORS[session.type]||'#64748b'} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{session.type}</div>
                  <div style={{ fontSize: 11, color: '#3d4560', marginTop: 1 }}>{session.date}{session.duration_min ? ` · ${session.duration_min} min` : ''}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {session.exercises?.length > 0 && <span style={{ fontSize: 11, color: '#3d4560' }}>{session.exercises.length} exercises</span>}
                {expanded===session.id ? <ChevronDown size={14} color="#475569" /> : <ChevronRight size={14} color="#475569" />}
              </div>
            </button>
            {expanded===session.id && session.exercises?.length > 0 && (
              <div style={{ padding: '4px 20px 14px 64px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {session.exercises.map((ex, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12 }}>
                    <span style={{ color: '#94a3b8', fontWeight: 500, minWidth: 120 }}>{ex.name}</span>
                    <span style={{ color: '#475569' }}>{ex.sets}×{ex.reps}{ex.weight_kg?` @ ${ex.weight_kg}kg`:''}</span>
                  </div>
                ))}
                {session.notes && <div style={{ fontSize: 11, color: '#3d4560', marginTop: 4, fontStyle: 'italic' }}>{session.notes}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
