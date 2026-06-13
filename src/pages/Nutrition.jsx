import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const emptyMacro = { date: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', notes: '' }
const emptySupp = { date: '', name: '', dose_mg: '', time_taken: '', type: 'supplement' }

export default function Nutrition() {
  const [macros, setMacros] = useState([])
  const [supps, setSupps] = useState([])
  const [macroForm, setMacroForm] = useState(emptyMacro)
  const [suppForm, setSuppForm] = useState(emptySupp)
  const [tab, setTab] = useState('macros')
  const [saving, setSaving] = useState(false)

  async function load() {
    const [m, s] = await Promise.all([
      supabase.from('macros').select('*').order('date', { ascending: false }).limit(14),
      supabase.from('stimulants').select('*').order('date', { ascending: false }).limit(30),
    ])
    setMacros(m.data || [])
    setSupps(s.data || [])
  }

  useEffect(() => { load() }, [])

  async function saveMacro(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('macros').insert([{
      ...macroForm,
      calories: parseInt(macroForm.calories) || null,
      protein_g: parseFloat(macroForm.protein_g) || null,
      carbs_g: parseFloat(macroForm.carbs_g) || null,
      fat_g: parseFloat(macroForm.fat_g) || null,
    }])
    setMacroForm(emptyMacro)
    await load()
    setSaving(false)
  }

  async function saveSupp(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('stimulants').insert([{
      ...suppForm,
      dose_mg: parseFloat(suppForm.dose_mg) || null,
    }])
    setSuppForm(emptySupp)
    await load()
    setSaving(false)
  }

  const today = macros[0]
  const macroChart = today ? [
    { name: 'Protein', value: today.protein_g || 0, color: '#6366f1' },
    { name: 'Carbs', value: today.carbs_g || 0, color: '#fbbf24' },
    { name: 'Fat', value: today.fat_g || 0, color: '#f87171' },
  ] : []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Nutrition</h1>

      <div className="flex gap-2">
        {['macros', 'supplements'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all"
            style={{ background: tab === t ? '#4f46e5' : '#1e1e2e', color: tab === t ? '#fff' : '#94a3b8' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'macros' && (
        <>
          <form onSubmit={saveMacro} className="card p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Date</label>
              <input type="date" value={macroForm.date} onChange={e => setMacroForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Calories</label>
              <input type="number" placeholder="2400" value={macroForm.calories} onChange={e => setMacroForm(f => ({ ...f, calories: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Protein (g)</label>
              <input type="number" placeholder="180" value={macroForm.protein_g} onChange={e => setMacroForm(f => ({ ...f, protein_g: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Carbs (g)</label>
              <input type="number" placeholder="250" value={macroForm.carbs_g} onChange={e => setMacroForm(f => ({ ...f, carbs_g: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Fat (g)</label>
              <input type="number" placeholder="80" value={macroForm.fat_g} onChange={e => setMacroForm(f => ({ ...f, fat_g: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Notes</label>
              <input type="text" placeholder="Meal notes..." value={macroForm.notes} onChange={e => setMacroForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="col-span-2 md:col-span-3">
              <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-lg text-white font-medium" style={{ background: '#16a34a' }}>
                {saving ? 'Saving...' : 'Log Macros'}
              </button>
            </div>
          </form>

          {today && macroChart.length > 0 && (
            <div className="card p-5 flex items-center gap-8">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={macroChart} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={60} strokeWidth={0}>
                    {macroChart.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-white">{today.calories} <span className="text-sm text-slate-500 font-normal">kcal</span></div>
                {macroChart.map(m => (
                  <div key={m.name} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                    <span className="text-slate-400">{m.name}</span>
                    <span className="text-white font-medium">{m.value}g</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/50"><span className="text-sm font-medium text-slate-400">History</span></div>
            {macros.map(m => (
              <div key={m.id} className="px-5 py-3.5 flex items-center justify-between border-b border-slate-800/30 last:border-0">
                <span className="text-sm text-white">{m.date}</span>
                <div className="flex gap-4 text-xs">
                  <span className="text-slate-300">{m.calories} kcal</span>
                  <span className="text-indigo-400">P {m.protein_g}g</span>
                  <span className="text-amber-400">C {m.carbs_g}g</span>
                  <span className="text-red-400">F {m.fat_g}g</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'supplements' && (
        <>
          <form onSubmit={saveSupp} className="card p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Date</label>
              <input type="date" value={suppForm.date} onChange={e => setSuppForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Name</label>
              <input type="text" placeholder="Creatine, Caffeine, Magnesium..." value={suppForm.name} onChange={e => setSuppForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Type</label>
              <select value={suppForm.type} onChange={e => setSuppForm(f => ({ ...f, type: e.target.value }))}>
                <option value="supplement">Supplement</option>
                <option value="stimulant">Stimulant</option>
                <option value="nootropic">Nootropic</option>
                <option value="vitamin">Vitamin</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Dose (mg)</label>
              <input type="number" placeholder="200" value={suppForm.dose_mg} onChange={e => setSuppForm(f => ({ ...f, dose_mg: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Time Taken</label>
              <input type="time" value={suppForm.time_taken} onChange={e => setSuppForm(f => ({ ...f, time_taken: e.target.value }))} />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={saving} className="w-full px-6 py-2.5 rounded-lg text-white font-medium" style={{ background: '#7c3aed' }}>
                {saving ? 'Saving...' : 'Log'}
              </button>
            </div>
          </form>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/50"><span className="text-sm font-medium text-slate-400">Log</span></div>
            {supps.map(s => (
              <div key={s.id} className="px-5 py-3.5 flex items-center justify-between border-b border-slate-800/30 last:border-0">
                <div>
                  <span className="text-sm text-white">{s.name}</span>
                  {s.dose_mg && <span className="text-xs text-slate-500 ml-2">{s.dose_mg}mg</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{s.time_taken}</span>
                  <span className="text-xs text-slate-600">{s.date}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#7c3aed22', color: '#a78bfa' }}>{s.type}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
