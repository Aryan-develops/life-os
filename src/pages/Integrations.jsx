import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { parseAppleHealthXML } from '../lib/appleHealth'
import { Link2, Apple, Heart, Upload, CheckCircle, AlertCircle, Info } from 'lucide-react'

export default function Integrations() {
  const [ahState, setAhState] = useState({ status: 'idle', msg: '', count: 0 })
  const [mfpState, setMfpState] = useState({ status: 'idle', msg: '', count: 0 })
  const [dragging, setDragging] = useState(null)

  async function handleAHFile(file) {
    if (!file || !file.name.endsWith('.xml')) {
      setAhState({ status: 'error', msg: 'Please select the export.xml file from Apple Health', count: 0 }); return
    }
    setAhState({ status: 'loading', msg: 'Parsing your Apple Health data...', count: 0 })
    try {
      const { sleepLogs, heartMetrics } = await parseAppleHealthXML(file)
      let inserted = 0
      if (sleepLogs.length) {
        await supabase.from('sleep_logs').upsert(sleepLogs, { onConflict: 'date,source' })
        inserted += sleepLogs.length
      }
      if (heartMetrics.length) {
        const byDate = {}
        for (const m of heartMetrics) {
          if (!byDate[m.date]) byDate[m.date] = { date: m.date, source: 'apple_health' }
          if (m.resting_hr) byDate[m.date].resting_hr = m.resting_hr
          if (m.hrv) byDate[m.date].hrv = m.hrv
        }
        await supabase.from('heart_metrics').upsert(Object.values(byDate), { onConflict: 'date,source' })
        inserted += Object.keys(byDate).length
      }
      setAhState({ status: 'success', msg: `Successfully imported data`, count: inserted, detail: `${sleepLogs.length} sleep records · ${Object.keys({}).length || heartMetrics.length} heart metric entries` })
    } catch (err) {
      setAhState({ status: 'error', msg: 'Failed to parse file. Make sure you selected the export.xml from your Apple Health zip.', count: 0 })
    }
  }

  async function handleMFPFile(file) {
    if (!file || !file.name.endsWith('.csv')) {
      setMfpState({ status: 'error', msg: 'Please upload a CSV file exported from MyFitnessPal', count: 0 }); return
    }
    setMfpState({ status: 'loading', msg: 'Parsing MyFitnessPal data...', count: 0 })
    try {
      const text = await file.text()
      const rows = parseMFPCSV(text)
      if (!rows.length) { setMfpState({ status: 'error', msg: 'No nutrition data found in CSV', count: 0 }); return }
      await supabase.from('macros').upsert(rows, { onConflict: 'date' })
      setMfpState({ status: 'success', msg: `Imported ${rows.length} days of nutrition data`, count: rows.length })
    } catch {
      setMfpState({ status: 'error', msg: 'Failed to parse CSV. Make sure it\'s the MFP nutrition export.', count: 0 })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Link2 size={17} color="#38bdf8" />
        </div>
        <h1 className="page-title">Integrations</h1>
      </div>

      {/* Info banner */}
      <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 12 }}>
        <Info size={16} color="#38bdf8" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#7dd3fc', marginBottom: 4 }}>How integrations work</div>
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
            Apple Health and MyFitnessPal don't offer public web APIs — they require exporting your data directly from their apps.
            Import those exports here and all your data syncs into Life OS instantly.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Apple Health */}
        <IntegrationCard
          icon={Heart}
          iconColor="#f87171"
          iconBg="rgba(248,113,113,0.15)"
          title="Apple Health"
          subtitle="Import sleep & heart data"
          status={ahState.status}
          msg={ahState.msg}
          count={ahState.count}
          onFile={handleAHFile}
          dragging={dragging === 'ah'}
          setDragging={v => setDragging(v ? 'ah' : null)}
          accept=".xml"
          fileLabel="export.xml"
          howTo={[
            'Open the Health app on your iPhone',
            'Tap your profile picture (top right)',
            'Tap "Export All Health Data"',
            'Share the ZIP, extract it, and upload export.xml here',
          ]}
          importsSummary="Imports: Sleep records, Resting HR, HRV"
        />

        {/* MyFitnessPal */}
        <IntegrationCard
          icon={Apple}
          iconColor="#34d399"
          iconBg="rgba(52,211,153,0.15)"
          title="MyFitnessPal"
          subtitle="Import nutrition & macro data"
          status={mfpState.status}
          msg={mfpState.msg}
          count={mfpState.count}
          onFile={handleMFPFile}
          dragging={dragging === 'mfp'}
          setDragging={v => setDragging(v ? 'mfp' : null)}
          accept=".csv"
          fileLabel="Nutrition.csv"
          howTo={[
            'Go to myfitnesspal.com and log in',
            'Click your username → Settings',
            'Go to "Export Data" → select date range',
            'Download the Nutrition CSV and upload here',
          ]}
          importsSummary="Imports: Calories, Protein, Carbs, Fat per day"
        />
      </div>

      {/* Manual data note */}
      <div className="card" style={{ padding: '22px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Manual logging is always available</div>
        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
          You can also log all data manually from each section (Sleep, Heart, Fitness, Nutrition). Imports complement your manual logs — duplicate dates are automatically deduplicated.
        </div>
      </div>
    </div>
  )
}

function IntegrationCard({ icon: Icon, iconColor, iconBg, title, subtitle, status, msg, count, onFile, dragging, setDragging, accept, fileLabel, howTo, importsSummary }) {
  const [showHow, setShowHow] = useState(false)

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={iconColor} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{title}</div>
          <div style={{ fontSize: 12, color: '#475569' }}>{subtitle}</div>
        </div>
        {status === 'success' && <CheckCircle size={18} color="#22c55e" style={{ marginLeft: 'auto' }} />}
      </div>

      {/* Import zone */}
      <label
        className={`import-zone${dragging ? ' drag-over' : ''}`}
        style={{ display: 'block', cursor: 'pointer' }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input type="file" accept={accept} style={{ display: 'none' }} onChange={e => onFile(e.target.files[0])} />
        {status === 'loading' ? (
          <div style={{ color: '#818cf8', fontSize: 13 }}>⟳ Processing...</div>
        ) : status === 'success' ? (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#4ade80', marginBottom: 4 }}>{msg}</div>
            <div style={{ fontSize: 11, color: '#475569' }}>Drop another file to re-import</div>
          </>
        ) : (
          <>
            <Upload size={24} color="#3d4560" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
              Drop <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 5, fontSize: 12 }}>{fileLabel}</code> here
            </div>
            <div style={{ fontSize: 11, color: '#3d4560' }}>or click to browse</div>
          </>
        )}
      </label>

      {status === 'error' && (
        <div style={{ display: 'flex', gap: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px' }}>
          <AlertCircle size={14} color="#fca5a5" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: '#fca5a5' }}>{msg}</span>
        </div>
      )}

      {/* What it imports */}
      <div style={{ fontSize: 11, color: '#3d4560', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 9, border: '1px solid rgba(255,255,255,0.04)' }}>
        {importsSummary}
      </div>

      {/* How to export instructions */}
      <div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', justifyContent: 'space-between' }}
          onClick={() => setShowHow(v => !v)}
        >
          <span>How to export from {title}</span>
          <span style={{ fontSize: 10 }}>{showHow ? '▲' : '▼'}</span>
        </button>
        {showHow && (
          <div className="animate-fade-in" style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {howTo.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#818cf8', flexShrink: 0 }}>{i+1}</div>
                <span style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{step}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function parseMFPCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase())

  const colIndex = (names) => {
    for (const n of names) {
      const i = headers.findIndex(h => h.includes(n))
      if (i !== -1) return i
    }
    return -1
  }

  const dateCol = colIndex(['date'])
  const calCol = colIndex(['calorie', 'energy'])
  const proteinCol = colIndex(['protein'])
  const carbsCol = colIndex(['carb'])
  const fatCol = colIndex(['fat'])

  if (dateCol === -1) return []

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''))
    const date = cols[dateCol]
    if (!date || date === 'Totals') continue
    rows.push({
      date,
      calories: parseInt(cols[calCol]) || null,
      protein_g: parseFloat(cols[proteinCol]) || null,
      carbs_g: parseFloat(cols[carbsCol]) || null,
      fat_g: parseFloat(cols[fatCol]) || null,
      notes: 'MyFitnessPal import',
    })
  }
  return rows.filter(r => r.date)
}
