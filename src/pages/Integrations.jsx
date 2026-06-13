import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, XCircle, Copy, Zap, Smartphone, Mail, Link } from 'lucide-react'

const SUPABASE_URL = 'https://lxvfaxvkbwquselrnaew.supabase.co'
const GMAIL_ENDPOINT = `${SUPABASE_URL}/functions/v1/gmail-cronometer-sync`
const HEALTH_ENDPOINT = `${SUPABASE_URL}/functions/v1/health-sync`

export default function Integrations() {
  const [copied, setCopied] = useState('')
  const [gmailStatus, setGmailStatus] = useState(null)
  const [gmailMsg, setGmailMsg] = useState('')
  const [gmailLastSync, setGmailLastSync] = useState(null)
  const [gmailConnected, setGmailConnected] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('gmail_last_sync')
    if (saved) setGmailLastSync(saved)
    const connected = localStorage.getItem('gmail_connected')
    if (connected) setGmailConnected(true)

    // Check URL params after OAuth redirect
    const params = new URLSearchParams(window.location.search)
    if (params.get('gmail_connected')) {
      setGmailConnected(true)
      localStorage.setItem('gmail_connected', '1')
      window.history.replaceState({}, '', '/integrations')
    }
    if (params.get('gmail_error')) {
      setGmailStatus('error')
      setGmailMsg('Gmail connection failed: ' + params.get('gmail_error'))
      window.history.replaceState({}, '', '/integrations')
    }
  }, [])

  async function syncGmail() {
    const apiKey = import.meta.env.VITE_SYNC_API_KEY
    if (!apiKey) { setGmailStatus('error'); setGmailMsg('VITE_SYNC_API_KEY not set'); return }
    setGmailStatus('syncing'); setGmailMsg('')
    try {
      const res = await fetch(GMAIL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        const ts = new Date().toLocaleString()
        setGmailStatus('ok')
        setGmailMsg(`Synced ${data.date}: ${data.macros?.calories ?? '?'} kcal · ${data.macros?.protein_g ?? '?'}g protein`)
        setGmailLastSync(ts)
        localStorage.setItem('gmail_last_sync', ts)
      } else {
        setGmailStatus('error')
        setGmailMsg(data.error || 'Sync failed')
      }
    } catch (err) {
      setGmailStatus('error'); setGmailMsg(err.message)
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

      {/* Cronometer via Gmail */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(234,179,8,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={19} color="#eab308" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Cronometer → Gmail Sync</div>
              <div style={{ fontSize: 12, color: '#3d4560', marginTop: 2 }}>
                Reads your daily Cronometer summary email · auto-syncs at 9 AM UTC
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: gmailConnected ? '#22c55e' : '#475569', boxShadow: gmailConnected ? '0 0 8px #22c55e' : 'none' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: gmailConnected ? '#22c55e' : '#475569' }}>
              {gmailConnected ? 'Connected' : 'Not connected'}
            </span>
          </div>
        </div>

        {/* Gmail OAuth button */}
        {!gmailConnected ? (
          <div style={{ marginBottom: 16 }}>
            <a
              href="/api/gmail-auth"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
            >
              <Link size={13} /> Connect Gmail
            </a>
            <div style={{ fontSize: 12, color: '#3d4560', marginTop: 10, lineHeight: 1.6 }}>
              Grants read-only access to find Cronometer summary emails. No other emails are read.
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10, fontSize: 13, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={14} /> Gmail connected — Cronometer emails will be parsed automatically
          </div>
        )}

        {gmailStatus && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, borderRadius: 10,
            padding: '10px 14px', marginBottom: 16, fontSize: 13,
            background: gmailStatus === 'ok' ? 'rgba(34,197,94,0.08)' : gmailStatus === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(234,179,8,0.08)',
            border: `1px solid ${gmailStatus === 'ok' ? 'rgba(34,197,94,0.2)' : gmailStatus === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.2)'}`,
            color: gmailStatus === 'ok' ? '#4ade80' : gmailStatus === 'error' ? '#fca5a5' : '#fde68a',
          }}>
            {gmailStatus === 'ok' && <CheckCircle size={14} />}
            {gmailStatus === 'error' && <XCircle size={14} />}
            {gmailStatus === 'syncing' && <RefreshCw size={14} />}
            <span>{gmailMsg || 'Syncing...'}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            className="btn"
            style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308', border: '1px solid rgba(234,179,8,0.25)', minWidth: 120 }}
            onClick={syncGmail}
            disabled={gmailStatus === 'syncing' || !gmailConnected}
          >
            <RefreshCw size={13} />
            {gmailStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
          </button>
          {gmailLastSync && <span style={{ fontSize: 12, color: '#3d4560' }}>Last synced: {gmailLastSync}</span>}
        </div>

        <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
          Also enable <strong style={{ color: '#94a3b8' }}>Daily Summary</strong> emails in Cronometer: Settings → Notifications → Daily Summary → On. Emails arrive each morning and are synced automatically.
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
            <div style={{ fontSize: 12, color: '#3d4560', marginTop: 2 }}>Syncs via iOS Shortcut · runs automatically every morning</div>
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
          { label: 'Gmail Sync', value: gmailConnected ? 'Connected' : 'Not set up', color: gmailConnected ? '#22c55e' : '#475569' },
          { label: 'Auto-Sync', value: 'Daily 9AM UTC', color: '#eab308' },
          { label: 'Health Endpoint', value: 'Live', color: '#a78bfa' },
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
