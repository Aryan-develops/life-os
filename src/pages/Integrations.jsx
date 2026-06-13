import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, XCircle, Copy, Zap, Smartphone, BarChart2 } from 'lucide-react'

const SUPABASE_URL = 'https://lxvfaxvkbwquselrnaew.supabase.co'
const HEALTH_ENDPOINT = `${SUPABASE_URL}/functions/v1/health-sync`
const CRONOMETER_ENDPOINT = `${SUPABASE_URL}/functions/v1/cronometer-sync`

export default function Integrations() {
  const [copied, setCopied] = useState('')
  const [cronoStatus, setCronoStatus] = useState(null)
  const [cronoMsg, setCronoMsg] = useState('')
  const [cronoLastSync, setCronoLastSync] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('crono_last_sync')
    if (saved) setCronoLastSync(saved)
  }, [])

  async function syncCronometer() {
    const apiKey = import.meta.env.VITE_SYNC_API_KEY
    if (!apiKey) { setCronoStatus('error'); setCronoMsg('VITE_SYNC_API_KEY not set in Vercel env vars'); return }
    setCronoStatus('syncing'); setCronoMsg('')
    try {
      const res = await fetch(CRONOMETER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        const ts = new Date().toLocaleString()
        setCronoStatus('ok')
        setCronoMsg(`Synced ${data.date}: ${data.macros?.calories ?? '?'} kcal · ${data.macros?.protein_g ?? '?'}g protein`)
        setCronoLastSync(ts)
        localStorage.setItem('crono_last_sync', ts)
      } else {
        setCronoStatus('error')
        setCronoMsg(data.error || 'Sync failed')
      }
    } catch (err) {
      setCronoStatus('error'); setCronoMsg(err.message)
    }
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const shortcutSteps = [
    'Open the Shortcuts app on your iPhone',
    'Tap + → Add Action → search "Get Health Samples"',
    'Add Sleep Analysis samples, last 7 days',
    'Add another "Get Health Samples" for Resting Heart Rate, last 7 days',
    'Add another for Heart Rate Variability (HRV), last 7 days',
    'Add "Get Contents of URL" — set URL to the endpoint below, Method = POST',
    'Add Header: Authorization = Bearer <paste your SYNC_API_KEY from .env>',
    'Set Request Body to JSON using the format shown below',
    'Go to Automation → Time of Day → 7:00 AM → run this shortcut',
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={17} color="#6366f1" />
        </div>
        <div>
          <h1 className="page-title">Integrations</h1>
          <div style={{ fontSize: 12, color: '#3d4560', marginTop: 2 }}>Connect Apple Health and Cronometer for automatic data sync</div>
        </div>
      </div>

      {/* Cronometer */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(251,191,36,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart2 size={19} color="#fbbf24" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Cronometer</div>
              <div style={{ fontSize: 12, color: '#3d4560', marginTop: 2 }}>Auto-syncs daily at 9 AM UTC · logs in with your credentials</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px #fbbf24' }} />
            <span style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>Active</span>
          </div>
        </div>

        {cronoStatus && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, borderRadius: 10,
            padding: '10px 14px', marginBottom: 16, fontSize: 13,
            background: cronoStatus === 'ok' ? 'rgba(34,197,94,0.08)' : cronoStatus === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(251,191,36,0.08)',
            border: `1px solid ${cronoStatus === 'ok' ? 'rgba(34,197,94,0.2)' : cronoStatus === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)'}`,
            color: cronoStatus === 'ok' ? '#4ade80' : cronoStatus === 'error' ? '#fca5a5' : '#fde68a',
          }}>
            {cronoStatus === 'ok' && <CheckCircle size={14} />}
            {cronoStatus === 'error' && <XCircle size={14} />}
            {cronoStatus === 'syncing' && <RefreshCw size={14} />}
            <span>{cronoMsg || 'Syncing...'}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)', minWidth: 120 }} onClick={syncCronometer} disabled={cronoStatus === 'syncing'}>
            <RefreshCw size={13} />
            {cronoStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
          </button>
          {cronoLastSync && <span style={{ fontSize: 12, color: '#3d4560' }}>Last synced: {cronoLastSync}</span>}
        </div>
      </div>

      {/* Apple Health */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(167,139,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Smartphone size={19} color="#a78bfa" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Apple Health</div>
            <div style={{ fontSize: 12, color: '#3d4560', marginTop: 2 }}>Syncs via iOS Shortcut · Set to run automatically every morning</div>
          </div>
        </div>

        <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#3d4560', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Endpoint URL</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ fontSize: 12, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
              {HEALTH_ENDPOINT}
            </code>
            <button className="btn btn-ghost btn-sm" onClick={() => copy(HEALTH_ENDPOINT, 'endpoint')} style={{ padding: '4px 10px', flexShrink: 0 }}>
              {copied === 'endpoint' ? <CheckCircle size={12} color="#22c55e" /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14 }}>Setup Steps</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {shortcutSteps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#818cf8', marginTop: 1 }}>{i + 1}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, paddingTop: 2 }}>{step}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: '#3d4560', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Request Body Format</div>
        <pre style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '14px 16px', fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', overflow: 'auto', border: '1px solid rgba(255,255,255,0.05)', lineHeight: 1.6, margin: 0 }}>{`{
  "sleep":    [{ "date": "2026-06-14", "bedtime": "23:00",
                 "wake_time": "07:00", "duration_hr": 8.0, "quality": 8 }],
  "heart":    [{ "date": "2026-06-14", "resting_hr": 58, "hrv": 72 }],
  "workouts": [{ "date": "2026-06-14", "type": "Strength", "duration_min": 60 }]
}`}</pre>
      </div>

      {/* Status tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Cronometer Auto-Sync', value: 'Daily 9AM UTC', color: '#fbbf24' },
          { label: 'Health Endpoint', value: 'Live', color: '#a78bfa' },
          { label: 'CSV Import', value: 'Also available', color: '#60a5fa' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '18px 20px' }}>
            <div className="section-title" style={{ marginBottom: 8 }}>{s.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

