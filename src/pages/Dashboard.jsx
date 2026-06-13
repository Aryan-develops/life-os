import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import MetricCard from '../components/MetricCard'
import AISchedule from '../components/AISchedule'
import { Moon, Heart, Dumbbell, Apple, TrendingUp, Activity } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const [data, setData] = useState({ sleep: [], heart: [], gym: [], macros: [], stims: [] })

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const [sleep, heart, gym, macros, stims] = await Promise.all([
        supabase.from('sleep_logs').select('*').order('date', { ascending: false }).limit(14),
        supabase.from('heart_metrics').select('*').order('date', { ascending: false }).limit(7),
        supabase.from('gym_sessions').select('*').order('date', { ascending: false }).limit(30),
        supabase.from('macros').select('*').eq('date', today).limit(1),
        supabase.from('stimulants').select('*').order('date', { ascending: false }).limit(20),
      ])
      setData({ sleep: sleep.data || [], heart: heart.data || [], gym: gym.data || [], macros: macros.data || [], stims: stims.data || [] })
    }
    load()
  }, [])

  const latest = { sleep: data.sleep[0], heart: data.heart[0], macro: data.macros[0] }

  const gymStreak = (() => {
    let streak = 0
    const sorted = [...data.gym].sort((a, b) => new Date(b.date) - new Date(a.date))
    let prev = new Date(); prev.setHours(0,0,0,0)
    for (const s of sorted) {
      const d = new Date(s.date); d.setHours(0,0,0,0)
      if ((prev - d) / 86400000 <= 1) { streak++; prev = d } else break
    }
    return streak
  })()

  const sleepChart = [...data.sleep].reverse().map(l => ({ date: l.date?.slice(5), hrs: l.duration_hr, quality: l.quality }))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a5568', marginBottom: 6 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {greeting}, <span className="gradient-text">Aryan</span>
          </h1>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, padding: '10px 16px', textAlign: 'right',
        }}>
          <div style={{ fontSize: 10, color: '#3d4560', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <MetricCard label="Sleep" value={latest.sleep?.duration_hr} unit="hrs" icon={Moon} color="#a78bfa"
          sub={latest.sleep ? `Quality ${latest.sleep.quality ?? '—'}/10 · ${latest.sleep.date}` : 'No data yet'} />
        <MetricCard label="Resting HR" value={latest.heart?.resting_hr} unit="bpm" icon={Heart} color="#f87171"
          sub={latest.heart?.hrv ? `HRV ${latest.heart.hrv} ms` : 'No data yet'} />
        <MetricCard label="Calories" value={latest.macro?.calories} unit="kcal" icon={Apple} color="#34d399"
          sub={latest.macro ? `P ${latest.macro.protein_g}g · C ${latest.macro.carbs_g}g · F ${latest.macro.fat_g}g` : 'No data today'} />
        <MetricCard label="Gym Streak" value={gymStreak} unit="days" icon={Dumbbell} color="#fbbf24"
          sub={`${data.gym.length} total sessions`} />
      </div>

      {/* Sleep chart + AI schedule */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 14 }}>
        {/* Sleep trend */}
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Sleep Trend</div>
            <span style={{ fontSize: 11, color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '3px 10px', borderRadius: 99, fontWeight: 600 }}>14 days</span>
          </div>
          {sleepChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={sleepChart} margin={{ top: 2, right: 2, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#2d3748', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: '#2d3748', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 12]} />
                <Tooltip
                  contentStyle={{ background: '#0e0e1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#a78bfa' }}
                  formatter={v => [`${v}h`, 'Sleep']}
                />
                <Area type="monotone" dataKey="hrs" stroke="#a78bfa" strokeWidth={2} fill="url(#sleepGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2d3748', fontSize: 13 }}>
              No sleep data yet — log some sleep to see trends
            </div>
          )}
        </div>

        {/* AI schedule */}
        <AISchedule sleepLogs={data.sleep} stimulants={data.stims} gymSessions={data.gym} />
      </div>

      {/* Recent gym sessions */}
      {data.gym.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={14} color="#fbbf24" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Recent Sessions</span>
          </div>
          {data.gym.slice(0, 5).map(s => (
            <div key={s.id} className="table-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor(s.type), flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{s.type}</span>
                <span style={{ fontSize: 11, color: '#3d4560' }}>{s.date}</span>
              </div>
              <span style={{ fontSize: 12, color: '#475569' }}>{s.duration_min ? `${s.duration_min} min` : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function typeColor(t) {
  const m = { Strength: '#fbbf24', Cardio: '#34d399', HIIT: '#f87171', Mobility: '#818cf8', Sports: '#38bdf8' }
  return m[t] || '#64748b'
}
