import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2 } from 'lucide-react'

const emptySession = { date: '', type: 'Strength', duration_min: '', notes: '', start_hour: '' }
const emptyExercise = { name: '', sets: '', reps: '', weight_kg: '' }

export default function Fitness() {
  const [sessions, setSessions] = useState([])
  const [form, setForm] = useState(emptySession)
  const [exercises, setExercises] = useState([{ ...emptyExercise }])
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(null)

  async function load() {
    const { data } = await supabase.from('gym_sessions').select('*').order('date', { ascending: false }).limit(30)
    setSessions(data || [])
  }

  useEffect(() => { load() }, [])

  function addExercise() { setExercises(e => [...e, { ...emptyExercise }]) }
  function removeExercise(i) { setExercises(e => e.filter((_, idx) => idx !== i)) }
  function updateExercise(i, field, val) {
    setExercises(e => e.map((ex, idx) => idx === i ? { ...ex, [field]: val } : ex))
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    const timeStr = form.start_hour
    const startHour = timeStr ? parseInt(timeStr.split(':')[0]) + parseInt(timeStr.split(':')[1]) / 60 : null
    await supabase.from('gym_sessions').insert([{
      date: form.date,
      type: form.type,
      duration_min: parseInt(form.duration_min) || null,
      notes: form.notes,
      start_hour: startHour,
      exercises: exercises.filter(ex => ex.name),
    }])
    setForm(emptySession)
    setExercises([{ ...emptyExercise }])
    await load()
    setSaving(false)
  }

  const types = ['Strength', 'Cardio', 'HIIT', 'Mobility', 'Sports', 'Other']

  // Activity heatmap - last 12 weeks
  const sessionDates = new Set(sessions.map(s => s.date))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Fitness</h1>

      <form onSubmit={save} className="card p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Date</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {types.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Start Time</label>
            <input type="time" value={form.start_hour} onChange={e => setForm(f => ({ ...f, start_hour: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Duration (min)</label>
            <input type="number" placeholder="60" value={form.duration_min} onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-500">Exercises</label>
            <button type="button" onClick={addExercise} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
              <Plus size={12} /> Add
            </button>
          </div>
          <div className="space-y-2">
            {exercises.map((ex, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-center">
                <input placeholder="Exercise name" value={ex.name} onChange={e => updateExercise(i, 'name', e.target.value)} className="col-span-1" />
                <input placeholder="Sets" type="number" value={ex.sets} onChange={e => updateExercise(i, 'sets', e.target.value)} />
                <input placeholder="Reps" type="number" value={ex.reps} onChange={e => updateExercise(i, 'reps', e.target.value)} />
                <div className="flex gap-1">
                  <input placeholder="kg" type="number" value={ex.weight_kg} onChange={e => updateExercise(i, 'weight_kg', e.target.value)} />
                  {exercises.length > 1 && (
                    <button type="button" onClick={() => removeExercise(i)} className="text-slate-600 hover:text-red-400 shrink-0">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">Notes</label>
          <textarea rows={2} placeholder="How did it go?" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="resize-none" />
        </div>

        <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-lg text-white font-medium" style={{ background: '#16a34a' }}>
          {saving ? 'Saving...' : 'Log Session'}
        </button>
      </form>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/50">
          <span className="text-sm font-medium text-slate-400">Sessions</span>
        </div>
        {sessions.slice(0, 15).map(session => (
          <div key={session.id} className="border-b border-slate-800/30 last:border-0">
            <button
              type="button"
              className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-white/2 transition-colors"
              onClick={() => setExpanded(expanded === session.id ? null : session.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-white">{session.date}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: typeColor(session.type) + '22', color: typeColor(session.type) }}>{session.type}</span>
              </div>
              <span className="text-xs text-slate-500">{session.duration_min ? `${session.duration_min} min` : ''}</span>
            </button>
            {expanded === session.id && session.exercises?.length > 0 && (
              <div className="px-5 pb-3 space-y-1">
                {session.exercises.map((ex, i) => (
                  <div key={i} className="text-xs text-slate-400">
                    {ex.name} — {ex.sets}×{ex.reps}{ex.weight_kg ? ` @ ${ex.weight_kg}kg` : ''}
                  </div>
                ))}
                {session.notes && <div className="text-xs text-slate-600 mt-1">{session.notes}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function typeColor(t) {
  const map = { Strength: '#fbbf24', Cardio: '#34d399', HIIT: '#f87171', Mobility: '#818cf8', Sports: '#38bdf8', Other: '#94a3b8' }
  return map[t] || '#94a3b8'
}
