import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Accept both API key auth and Supabase anon key (for cron)
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  const syncKey = Deno.env.get('SYNC_API_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (token !== syncKey && token !== anonKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const mfpUsername = Deno.env.get('MFP_USERNAME')
  if (!mfpUsername) {
    return new Response(JSON.stringify({ error: 'MFP_USERNAME not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Parse optional date from body (defaults to yesterday)
  let targetDate: string
  try {
    const body = await req.json().catch(() => ({}))
    targetDate = body.date ?? yesterday()
  } catch {
    targetDate = yesterday()
  }

  const url = `https://www.myfitnesspal.com/food/diary/${mfpUsername}?date=${targetDate}`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `MFP returned ${res.status}. Make sure your diary is set to Public.` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const html = await res.text()
    const macros = parseMFPDiary(html, targetDate)

    if (!macros) {
      return new Response(
        JSON.stringify({ error: 'Could not parse diary. Diary may be empty or private.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { error } = await supabase
      .from('macros')
      .upsert([macros], { onConflict: 'date' })

    if (error) throw error

    return new Response(
      JSON.stringify({ ok: true, date: targetDate, macros, synced_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function parseMFPDiary(html: string, date: string) {
  // MFP diary totals row pattern
  // Look for the "Totals" row in the food diary table
  const totalsMatch = html.match(
    /class="[^"]*total[^"]*"[^>]*>[\s\S]{0,2000}?(\d+)<\/td>[\s\S]{0,200}?(\d+)<\/td>[\s\S]{0,200}?(\d+)<\/td>[\s\S]{0,200}?(\d+)<\/td>/i
  )

  if (totalsMatch) {
    return {
      date,
      calories: parseInt(totalsMatch[1]) || null,
      carbs_g: parseFloat(totalsMatch[2]) || null,
      fat_g: parseFloat(totalsMatch[3]) || null,
      protein_g: parseFloat(totalsMatch[4]) || null,
      notes: 'MyFitnessPal auto-sync',
    }
  }

  // Fallback: look for nutrition summary numbers in meta/JSON
  const nutritionMatch = html.match(
    /"calories"\s*:\s*(\d+).*?"carbohydrates"\s*:\s*([\d.]+).*?"fat"\s*:\s*([\d.]+).*?"protein"\s*:\s*([\d.]+)/s
  )
  if (nutritionMatch) {
    return {
      date,
      calories: parseInt(nutritionMatch[1]) || null,
      carbs_g: parseFloat(nutritionMatch[2]) || null,
      fat_g: parseFloat(nutritionMatch[3]) || null,
      protein_g: parseFloat(nutritionMatch[4]) || null,
      notes: 'MyFitnessPal auto-sync',
    }
  }

  return null
}

function yesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}
