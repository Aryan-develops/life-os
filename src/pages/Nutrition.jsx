import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Apple, Plus, Pill, Upload, CheckCircle } from 'lucide-react'

const emptyMacro = { date: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', notes: '' }
const emptySupp = { date: '', name: '', dose_mg: '', time_taken: '', type: 'supplement' }

function parseCronometerCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const header = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase())
  const dayIdx = header.findIndex(h => h === 'day')
  const calIdx = header.findIndex(h => h.includes('energy'))
  const protIdx = header.findIndex(h => h.includes('protein'))
  const carbIdx = header.findIndex(h => h.includes('carb') && !h.includes('net'))
  const fatIdx = header.findIndex(h => h === 'fat')

  const byDate = {}
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$)/g) || lines[i].split(',')
    const clean = cols.map(c => c?.replace(/"/g, '').trim())
    const date = clean[dayIdx]
    if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) continue
    const d = date.slice(0, 10)
    if (!byDate[d]) byDate[d] = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    byDate[d].calories += parseFloat(clean[calIdx]) || 0
    byDate[d].protein_g += parseFloat(clean[protIdx]) || 0
    byDate[d].carbs_g += parseFloat(clean[carbIdx]) || 0
    byDate[d].fat_g += parseFloat(clean[fatIdx]) || 0
  }
  return Object.entries(byDate).map(([date, m]) => ({
    date,
    calories: Math.round(m.calories),
    protein_g: Math.round(m.protein_g * 10) / 10,
    carbs_g: Math.round(m.carbs_g * 10) / 10,
    fat_g: Math.round(m.fat_g * 10) / 10,
    notes: 'Cronometer import',
  }))
}

export default function Nutrition() {
  const [macros, setMacros] = useState([])
  const [supps, setSupps] = useState([])
  const [macroForm, setMacroForm] = useState(emptyMacro)
  const [suppForm, setSuppForm] = useState(emptySupp)
  const [tab, setTab] = useState('macros')
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  async function load() {
    const [m, s] = await Promise.all([
      supabase.from('macros').select('*').order('date', { ascending: false }).limit(30),
      supabase.from('stimulants').select('*').order('date', { ascending: false }).limit(50),
    ])
    setMacros(m.data || []); setSupps(s.data || [])
  }
  useEffect(() => { load() }, [])

  async function saveMacro(e) {
    e.preventDefault(); setSaving(true)
    await supabase.from('macros').insert([{ ...macroForm, calories: parseInt(macroForm.calories)||null, protein_g: parseFloat(macroForm.protein_g)||null, carbs_g: parseFloat(macroForm.carbs_g)||null, fat_g: parseFloat(macroForm.fat_g)||null }])
    setMacroForm(emptyMacro); setShowForm(false); await load(); setSaving(false)
  }
  async function saveSupp(e) {
    e.preventDefault(); setSaving(true)
    await supabase.from('stimulants').insert([{ ...suppForm, dose_mg: parseFloat(suppForm.dose_mg)||null }])
    setSuppForm(emptySupp); setShowForm(false); await load(); setSaving(false)
  }

  const today = macros[0]
  const macroChart = today ? [
    { name: 'Protein', value: today.protein_g||0, color: '#818cf8' },
    { name: 'Carbs', value: today.carbs_g||0, color: '#fbbf24' },
    { name: 'Fat', value: today.fat_g||0, color: '#f87171' },
  ] : []

  const avgCals = macros.length ? Math.round(macros.slice(0,7).reduce((s,m)=>s+(m.calories||0),0) / Math.min(macros.slice(0,7).length,7)) : null

  async function importCronometer(e) {
    const file = e.target.files[0]; if (!file) return
    setImporting(true); setImportMsg('Parsing Cronometer export...')
    try {
      const text = await file.text()
      const rows = parseCronometerCSV(text)
      if (!rows.length) { setImportMsg('No data found. Make sure you exported "Servings" from Cronometer.'); setImporting(false); return }
      await supabase.from('macros').upsert(rows, { onConflict: 'date' })
      await load()
      setImportMsg(`✓ Imported ${rows.length} days from Cronometer`)
    } catch (err) {
      setImportMsg('Error parsing file: ' + err.message)
    }
    setImporting(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Apple size={17} color="#34d399" />
          </div>
          <h1 className="page-title">Nutrition</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="btn btn-ghost" style={{ cursor: 'pointer', position: 'relative' }}>
            {importing ? '⟳ Importing...' : <><Upload size={13} /> Cronometer CSV</>}
            <input type="file" accept=".csv" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={importCronometer} disabled={importing} />
          </label>
          <button className="btn btn-primary" onClick={() => setShowForm(v=>!v)}><Plus size={13} /> Log</button>
        </div>
      </div>

      {importMsg && (
        <div style={{ background: importMsg.startsWith('✓') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${importMsg.startsWith('✓') ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 12, padding: '12px 16px', fontSize: 13, color: importMsg.startsWith('✓') ? '#4ade80' : '#fca5a5', display: 'flex', alignItems: 'center', gap: 8 }}>
          {importMsg.startsWith('✓') && <CheckCircle size={14} />}
          {importMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab${tab==='macros'?' active':''}`} onClick={()=>{setTab('macros');setShowForm(false)}}>Macros</button>
        <button className={`tab${tab==='supplements'?' active':''}`} onClick={()=>{setTab('supplements');setShowForm(false)}}>Supplements & Stims</button>
      </div>

      {tab === 'macros' && (
        <>
          {/* Today's snapshot */}
          {today && (
            <div className="card" style={{ padding: 22, display: 'flex', alignItems: 'center', gap: 32 }}>
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={macroChart} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={58} strokeWidth={0}>
                    {macroChart.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:'#0e0e1a',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,fontSize:12}}/>
                </PieChart>
              </ResponsiveContainer>
              <div>
                <div style={{ fontSize: 11, color: '#3d4560', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Today · {today.date}</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: 12 }}>{today.calories} <span style={{ fontSize: 14, color: '#475569', fontWeight: 500 }}>kcal</span></div>
                <div style={{ display: 'flex', gap: 20 }}>
                  {macroChart.map(m=>(
                    <div key={m.name}>
                      <div style={{ fontSize: 10, color: '#3d4560', marginBottom: 2 }}>{m.name}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: m.color }}>{m.value}g</div>
                    </div>
                  ))}
                </div>
                {avgCals && <div style={{ fontSize: 11, color: '#3d4560', marginTop: 10 }}>7-day avg: {avgCals} kcal</div>}
              </div>
            </div>
          )}

          {showForm && (
            <form onSubmit={saveMacro} className="card animate-fade-in" style={{ padding: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 18 }}>Log Daily Macros</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
                <div><label className="label">Date</label><input type="date" value={macroForm.date} onChange={e=>setMacroForm(f=>({...f,date:e.target.value}))} required /></div>
                <div><label className="label">Calories</label><input type="number" placeholder="2400" value={macroForm.calories} onChange={e=>setMacroForm(f=>({...f,calories:e.target.value}))} /></div>
                <div><label className="label">Protein (g)</label><input type="number" placeholder="180" value={macroForm.protein_g} onChange={e=>setMacroForm(f=>({...f,protein_g:e.target.value}))} /></div>
                <div><label className="label">Carbs (g)</label><input type="number" placeholder="250" value={macroForm.carbs_g} onChange={e=>setMacroForm(f=>({...f,carbs_g:e.target.value}))} /></div>
                <div><label className="label">Fat (g)</label><input type="number" placeholder="80" value={macroForm.fat_g} onChange={e=>setMacroForm(f=>({...f,fat_g:e.target.value}))} /></div>
                <div><label className="label">Notes</label><input type="text" placeholder="Meal notes..." value={macroForm.notes} onChange={e=>setMacroForm(f=>({...f,notes:e.target.value}))} /></div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={saving} className="btn btn-green">{saving ? 'Saving...' : 'Save Macros'}</button>
                <button type="button" className="btn btn-ghost" onClick={()=>setShowForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13, fontWeight: 700, color: '#fff' }}>History</div>
            {macros.length===0 && <div style={{ padding:'32px 20px',textAlign:'center',color:'#3d4560',fontSize:13 }}>No macros logged. Import from Cronometer CSV or log manually.</div>}
            {macros.map(m=>(
              <div key={m.id} className="table-row">
                <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{m.date}</span>
                <div style={{ display: 'flex', gap: 20 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{m.calories} <span style={{ fontSize: 11, color: '#475569', fontWeight: 400 }}>kcal</span></span>
                  <span style={{ fontSize: 12, color: '#818cf8' }}>P {m.protein_g}g</span>
                  <span style={{ fontSize: 12, color: '#fbbf24' }}>C {m.carbs_g}g</span>
                  <span style={{ fontSize: 12, color: '#f87171' }}>F {m.fat_g}g</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'supplements' && (
        <>
          {showForm && (
            <form onSubmit={saveSupp} className="card animate-fade-in" style={{ padding: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 18 }}>Log Supplement / Stimulant</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
                <div><label className="label">Date</label><input type="date" value={suppForm.date} onChange={e=>setSuppForm(f=>({...f,date:e.target.value}))} required /></div>
                <div><label className="label">Name</label><input type="text" placeholder="Caffeine, Creatine, Magnesium..." value={suppForm.name} onChange={e=>setSuppForm(f=>({...f,name:e.target.value}))} required /></div>
                <div><label className="label">Type</label>
                  <select value={suppForm.type} onChange={e=>setSuppForm(f=>({...f,type:e.target.value}))}>
                    <option value="supplement">Supplement</option>
                    <option value="stimulant">Stimulant</option>
                    <option value="nootropic">Nootropic</option>
                    <option value="vitamin">Vitamin</option>
                    <option value="mineral">Mineral</option>
                  </select>
                </div>
                <div><label className="label">Dose (mg)</label><input type="number" placeholder="200" value={suppForm.dose_mg} onChange={e=>setSuppForm(f=>({...f,dose_mg:e.target.value}))} /></div>
                <div><label className="label">Time Taken</label><input type="time" value={suppForm.time_taken} onChange={e=>setSuppForm(f=>({...f,time_taken:e.target.value}))} /></div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving...' : 'Save'}</button>
                <button type="button" className="btn btn-ghost" onClick={()=>setShowForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13, fontWeight: 700, color: '#fff' }}>Log</div>
            {supps.length===0 && <div style={{ padding:'32px 20px',textAlign:'center',color:'#3d4560',fontSize:13 }}>No supplements logged yet.</div>}
            {supps.map(s=>(
              <div key={s.id} className="table-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: typeColor(s.type)+'18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Pill size={13} color={typeColor(s.type)} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#3d4560' }}>{s.date}{s.time_taken ? ` · ${s.time_taken}` : ''}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {s.dose_mg && <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>{s.dose_mg}mg</span>}
                  <span className="badge" style={{ background: typeColor(s.type)+'18', color: typeColor(s.type) }}>{s.type}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function typeColor(t) {
  const m = { stimulant:'#fbbf24', supplement:'#818cf8', nootropic:'#38bdf8', vitamin:'#34d399', mineral:'#a78bfa' }
  return m[t]||'#64748b'
}
