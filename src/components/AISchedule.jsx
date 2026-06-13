import { useState } from 'react'
import { Sparkles, RefreshCw, Moon, Zap, Dumbbell, Coffee, Pill } from 'lucide-react'
import { buildScheduleContext, formatHour } from '../lib/scheduleEngine'

export default function AISchedule({ sleepLogs, stimulants, gymSessions }) {
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function generate() {
    setLoading(true)
    setError(null)
    const ctx = buildScheduleContext(sleepLogs, stimulants, gymSessions)

    const prompt = `You are a performance optimization coach. Generate a precise daily schedule for today based on this biometric data:

- Average wake time: ${formatHour(ctx.avgWake)}
- Average sleep time: ${formatHour(ctx.avgSleep)}
- Average sleep quality: ${ctx.avgQuality.toFixed(1)}/10
- Usual gym time: ${formatHour(ctx.avgGymHour)}
- Today's stimulants: ${ctx.todayStims.length ? ctx.todayStims.map(s => `${s.dose_mg}mg ${s.type} at ${s.time_taken}`).join(', ') : 'none logged yet'}

Respond ONLY with a raw JSON object (no markdown, no code fences):
{
  "bedtime": "10:45 PM",
  "wake": "6:30 AM",
  "deepWork1": { "start": "8:00 AM", "end": "10:30 AM", "note": "..." },
  "deepWork2": { "start": "2:00 PM", "end": "4:00 PM", "note": "..." },
  "gym": { "start": "5:00 PM", "end": "6:30 PM", "note": "..." },
  "lastCaffeine": "1:00 PM",
  "supplements": [{ "name": "Magnesium", "time": "9:00 PM" }],
  "peakHours": "9 AM – 11 AM and 2 PM – 4 PM",
  "insight": "One sentence insight about today's optimization."
}`

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 700, temperature: 0.7 },
          }),
        }
      )
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        setSchedule(JSON.parse(jsonMatch[0]))
      } else {
        setError('Could not parse schedule response. Try again.')
      }
    } catch (e) {
      setError('Failed to generate. Check your Gemini API key in settings.')
    }
    setLoading(false)
  }

  const blocks = schedule ? [
    schedule.deepWork1 && { icon: Zap, color: '#818cf8', label: 'Deep Work', time: `${schedule.deepWork1.start} – ${schedule.deepWork1.end}`, note: schedule.deepWork1.note },
    schedule.deepWork2 && { icon: Zap, color: '#818cf8', label: 'Deep Work', time: `${schedule.deepWork2.start} – ${schedule.deepWork2.end}`, note: schedule.deepWork2.note },
    schedule.gym && { icon: Dumbbell, color: '#4ade80', label: 'Gym', time: `${schedule.gym.start} – ${schedule.gym.end}`, note: schedule.gym.note },
    schedule.lastCaffeine && { icon: Coffee, color: '#fbbf24', label: 'Last Caffeine', time: schedule.lastCaffeine, note: 'After this, switch to water' },
    schedule.bedtime && { icon: Moon, color: '#a78bfa', label: 'Sleep', time: schedule.bedtime, note: `Wake at ${schedule.wake}` },
    ...(schedule.supplements?.map(s => ({ icon: Pill, color: '#38bdf8', label: s.name, time: s.time, note: 'Supplement' })) || []),
  ].filter(Boolean) : []

  return (
    <div className="card-glow" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))',
            border: '1px solid rgba(99,102,241,0.3)',
          }}>
            <Sparkles size={16} color="#818cf8" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>AI Daily Schedule</div>
            <div style={{ fontSize: 11, color: '#475569' }}>Powered by Gemini 2.5 Pro</div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={generate} disabled={loading} style={{ minWidth: 120 }}>
          {loading
            ? <><span className="animate-spin" style={{ display: 'inline-block' }}>⟳</span> Generating</>
            : <><RefreshCw size={13} /> Generate</>}
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!schedule && !loading && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🧠</div>
          <div style={{ fontSize: 14, color: '#475569', marginBottom: 4 }}>No schedule generated yet</div>
          <div style={{ fontSize: 12, color: '#2d3748' }}>Log some sleep and gym sessions, then hit Generate</div>
        </div>
      )}

      {schedule && (
        <div className="animate-fade-in">
          {/* Insight banner */}
          <div style={{
            background: 'linear-gradient(90deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06))',
            border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 20,
            fontSize: 13, color: '#a5b4fc', fontStyle: 'italic',
          }}>
            "{schedule.insight}"
          </div>

          {/* Key times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Sleep Tonight', value: schedule.bedtime, color: '#a78bfa' },
              { label: 'Wake Up', value: schedule.wake, color: '#fbbf24' },
              { label: 'Peak Hours', value: schedule.peakHours, color: '#34d399' },
            ].map(item => (
              <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3d4560', marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {blocks.map((block, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 12, padding: '12px 16px',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${block.color}18`, flexShrink: 0,
                }}>
                  <block.icon size={14} color={block.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{block.label}</div>
                  {block.note && <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>{block.note}</div>}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: block.color, flexShrink: 0 }}>{block.time}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
