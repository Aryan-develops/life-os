import { useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { buildScheduleContext, alertnessScore, formatHour, recommendedBedtime } from '../lib/scheduleEngine'

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

Respond with a JSON object with these exact keys:
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
            generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
          }),
        }
      )
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        setSchedule(JSON.parse(jsonMatch[0]))
      } else {
        setError('Could not parse schedule. Try again.')
      }
    } catch (e) {
      setError('Failed to generate schedule. Check your API key.')
    }
    setLoading(false)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-indigo-400" />
          <span className="font-semibold text-white">AI Daily Schedule</span>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#4f46e5' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!schedule && !loading && (
        <p className="text-slate-500 text-sm">Click Generate to get your AI-optimized schedule for today.</p>
      )}

      {schedule && (
        <div className="space-y-4">
          <p className="text-sm text-indigo-300 italic">"{schedule.insight}"</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ background: '#0d0d1f' }}>
              <div className="text-xs text-slate-500 mb-1">Sleep Tonight</div>
              <div className="text-white font-semibold">{schedule.bedtime}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: '#0d0d1f' }}>
              <div className="text-xs text-slate-500 mb-1">Wake Up</div>
              <div className="text-white font-semibold">{schedule.wake}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Peak Hours</div>
            <div className="text-sm text-amber-300 font-medium">{schedule.peakHours}</div>
          </div>

          <div className="space-y-2">
            {[schedule.deepWork1, schedule.deepWork2].map((block, i) => block && (
              <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: '#0d0d1f' }}>
                <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <div>
                  <div className="text-sm text-white font-medium">Deep Work · {block.start} – {block.end}</div>
                  <div className="text-xs text-slate-500">{block.note}</div>
                </div>
              </div>
            ))}
            {schedule.gym && (
              <div className="flex items-start gap-3 rounded-xl p-3" style={{ background: '#0d0d1f' }}>
                <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
                <div>
                  <div className="text-sm text-white font-medium">Gym · {schedule.gym.start} – {schedule.gym.end}</div>
                  <div className="text-xs text-slate-500">{schedule.gym.note}</div>
                </div>
              </div>
            )}
            {schedule.lastCaffeine && (
              <div className="flex items-start gap-3 rounded-xl p-3" style={{ background: '#0d0d1f' }}>
                <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <div className="text-sm text-white font-medium">Last Caffeine · {schedule.lastCaffeine}</div>
              </div>
            )}
            {schedule.supplements?.map((s, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: '#0d0d1f' }}>
                <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <div className="text-sm text-white font-medium">{s.name} · {s.time}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
