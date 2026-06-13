import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Auth check
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  const expectedKey = Deno.env.get('SYNC_API_KEY')

  if (!expectedKey || token !== expectedKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const body = await req.json()
  const results: Record<string, number> = {}

  // Sleep logs
  if (body.sleep?.length) {
    const rows = body.sleep.map((s: any) => ({
      date: s.date,
      bedtime: s.bedtime ?? null,
      wake_time: s.wake_time ?? null,
      sleep_hour: s.sleep_hour ?? null,
      wake_hour: s.wake_hour ?? null,
      duration_hr: s.duration_hr ?? null,
      quality: s.quality ?? null,
      notes: s.notes ?? null,
      source: 'apple_health_shortcut',
    }))
    const { error } = await supabase
      .from('sleep_logs')
      .upsert(rows, { onConflict: 'date,source', ignoreDuplicates: false })
    if (error) console.error('sleep error:', error)
    results.sleep = rows.length
  }

  // Heart metrics
  if (body.heart?.length) {
    const rows = body.heart.map((h: any) => ({
      date: h.date,
      resting_hr: h.resting_hr ?? null,
      hrv: h.hrv ?? null,
      vo2max: h.vo2max ?? null,
      source: 'apple_health_shortcut',
    }))
    const { error } = await supabase
      .from('heart_metrics')
      .upsert(rows, { onConflict: 'date,source', ignoreDuplicates: false })
    if (error) console.error('heart error:', error)
    results.heart = rows.length
  }

  // Workouts
  if (body.workouts?.length) {
    const rows = body.workouts.map((w: any) => ({
      date: w.date,
      type: w.type ?? 'Other',
      duration_min: w.duration_min ?? null,
      start_hour: w.start_hour ?? null,
      exercises: [],
      notes: 'Apple Health import',
    }))
    const { error } = await supabase
      .from('gym_sessions')
      .upsert(rows, { onConflict: 'date', ignoreDuplicates: true })
    if (error) console.error('workout error:', error)
    results.workouts = rows.length
  }

  return new Response(
    JSON.stringify({ ok: true, inserted: results, synced_at: new Date().toISOString() }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
