import { useState, useEffect } from 'react'
import { Activity, RefreshCw, CheckCircle, XCircle, Copy, Zap, Smartphone } from 'lucide-react'

const SUPABASE_URL = 'https://lxvfaxvkbwquselrnaew.supabase.co'
const HEALTH_ENDPOINT = `${SUPABASE_URL}/functions/v1/health-sync`
const MFP_ENDPOINT = `${SUPABASE_URL}/functions/v1/mfp-sync`
const MFP_USERNAME = 'AryanJohar7'

export default function Integrations() {
  const [mfpStatus, setMfpStatus] = useState(null)
  const [mfpMessage, setMfpMessage] = useState('')
  const [mfpLastSync, setMfpLastSync] = useState(null)
  const [copied, setCopied] = useState('')

  // VITE_SYNC_API_KEY must be set in Vercel env vars (same value as Supabase SYNC_API_KEY secret)
  const syncApiKey = import.meta.env.VITE_SYNC_API_KEY

  useEffect(() => {
    const saved = localStorage.getItem('mfp_last_sync')
    if (saved) setMfpLastSync(saved)
  }, [])

  async function syncMFP() {
    if (!syncApiKey) {
      setMfpStatus('error')
      setMfpMessage('VITE_SYNC_API_KEY not configured. Add it to Vercel environment variables and redeploy.')
      return
    }
    setMfpStatus('syncing')
    setMfpMessage('')
    try {
      const res = await fetch(MFP_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${syncApiKey}` },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        const ts = new Date().toLocaleString()
        setMfpStatus('ok')
        setMfpMessage(`Synced ${data.date}: ${data.macros?.calories ?? '?'} kcal · ${data.macros?.protein_g ?? '?'}g protein`)
        setMfpLastSync(ts)
        localStorage.setItem('mfp_last_sync', ts)
      } else {
        setMfpStatus('error')
        setMfpMessage(data.error || 'Sync failed')
      }
    } catch (err) {
      setMfpStatus('error')
      setMfpMessage(err.message)
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
          <div style={{ fontSize: 12, color: '#3d4560', marginTop: 2 }}>Live sync for Apple Health and MyFitnessPal</div>
        </div>
      </div>

      {/* MyFitnessPal */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={19} color="#22c55e" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>MyFitnessPal</div>
              <div style={{ fontSize: 12, color: '#3d4560', marginTop: 2 }}>
                Connected as <span style={{ color: '#22c55e', fontWeight: 600 }}>{MFP_USERNAME}</span>
                {' · '}Auto-syncs daily at 9 AM UTC
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
            <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Active</span>
          </div>
        </div>

        {mfpStatus && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, borderRadius: 10,
            padding: '10px 14px', marginBottom: 16, fontSize: 13,
            background: mfpStatus === 'ok' ? 'rgba(34,197,94,0.08)' : mfpStatus === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(99,102,241,0.08)',
            border: `1px solid ${mfpStatus === 'ok' ? 'rgba(34,197,94,0.2)' : mfpStatus === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)'}`,
            color: mfpStatus === 'ok' ? '#4ade80' : mfpStatus === 'error' ? '#fca5a5' : '#a5b4fc',
          }}>
            {mfpStatus === 'ok' && <CheckCircle size={14} />}
            {mfpStatus === 'error' && <XCircle size={14} />}
            {mfpStatus === 'syncing' && <RefreshCw size={14} />}
            <span>{mfpMessage || 'Syncing...'}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn btn-green" onClick={syncMFP} disabled={mfpStatus === 'syncing'} style={{ minWidth: 120 }}>
            <RefreshCw size={13} />
            {mfpStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
          </button>
          {mfpLastSync && <span style={{ fontSize: 12, color: '#3d4560' }}>Last synced: {mfpLastSync}</span>}
        </div>

        <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
          Your MFP diary must be <strong style={{ color: '#94a3b8' }}>Public</strong>: MyFitnessPal → Settings → Diary Settings → Diary Sharing → Public.
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

        {/* Endpoint copy box */}
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
  "sleep":    [{ "date": "2026-06-13", "bedtime": "23:00",
                 "wake_time": "07:00", "duration_hr": 8.0, "quality": 8 }],
  "heart":    [{ "date": "2026-06-13", "resting_hr": 58, "hrv": 72 }],
  "workouts": [{ "date": "2026-06-13", "type": "Strength", "duration_min": 60 }]
}`}</pre>
      </div>

      {/* Status tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'MFP Auto-Sync', value: 'Daily 9AM UTC', color: '#22c55e' },
          { label: 'Health Endpoint', value: 'Live', color: '#a78bfa' },
          { label: 'MFP Username', value: MFP_USERNAME, color: '#60a5fa' },
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
