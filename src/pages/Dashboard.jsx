import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import MetricCard from '../components/MetricCard'
import AISchedule from '../components/AISchedule'
import { Moon, Heart, Dumbbell, Apple } from 'lucide-react'

export default function Dashboard() {
  const [data, setData] = useState({ sleep: [], heart: [], gym: [], macros: [], stims: [] })

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const [sleep, heart, gym, macros, stims] = await Promise.all([
        supabase.from('sleep_logs').select('*').order('date', { ascending: false }).limit(7),
        supabase.from('heart_metrics').select('*').order('date', { ascending: false }).limit(7),
        supabase.from('gym_sessions').select('*').order('date', { ascending: false }).limit(20),
        supabase.from('macros').select('*').eq('date', today).limit(1),
        supabase.from('stimulants').select('*').order('date', { ascending: false }).limit(20),
      ])
      setData({
        sleep: sleep.data || [],
        heart: heart.data || [],
        gym: gym.data || [],
        macros: macros.data || [],
        stims: stims.data || [],
      })
    }
    load()
  }, [])

  const latest = {
    sleep: data.sleep[0],
    heart: data.heart[0],
    macro: data.macros[0],
  }

  const gymStreak = (() => {
    let streak = 0
    const sorted = [...data.gym].sort((a, b) => new Date(b.date) - new Date(a.date))
    let prev = new Date()
    prev.setHours(0, 0, 0, 0)
    for (const s of sorted) {
      const d = new Date(s.date)
      d.setHours(0, 0, 0, 0)
      const diff = (prev - d) / 86400000
      if (diff <= 1) { streak++; prev = d }
      else break
    }
    return streak
  })()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Good {hour() < 12 ? 'morning' : hour() < 17 ? 'afternoon' : 'evening'}, Aryan</h1>
        <p className="text-slate-500 text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Sleep" value={latest.sleep?.duration_hr} unit="hrs" icon={Moon} color="#818cf8" sub={`Quality ${latest.sleep?.quality ?? '—'}/10`} />
        <MetricCard label="Resting HR" value={latest.heart?.resting_hr} unit="bpm" icon={Heart} color="#f87171" sub={`HRV ${latest.heart?.hrv ?? '—'} ms`} />
        <MetricCard label="Calories" value={latest.macro?.calories} unit="kcal" icon={Apple} color="#34d399" sub={`P ${latest.macro?.protein_g ?? '—'}g  C ${latest.macro?.carbs_g ?? '—'}g  F ${latest.macro?.fat_g ?? '—'}g`} />
        <MetricCard label="Gym Streak" value={gymStreak} unit="days" icon={Dumbbell} color="#fbbf24" sub={`${data.gym.length} sessions logged`} />
      </div>

      <AISchedule sleepLogs={data.sleep} stimulants={data.stims} gymSessions={data.gym} />
    </div>
  )
}

function hour() { return new Date().getHours() }
