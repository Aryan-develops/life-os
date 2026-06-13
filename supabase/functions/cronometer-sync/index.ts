import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  const syncKey = Deno.env.get('SYNC_API_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (token !== syncKey && token !== anonKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const email = Deno.env.get('CRONOMETER_EMAIL')
  const password = Deno.env.get('CRONOMETER_PASSWORD')
  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'CRONOMETER_EMAIL / CRONOMETER_PASSWORD not set' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const body = await req.json().catch(() => ({}))
  const targetDate = body.date ?? yesterday()

  try {
    // Step 1: Login and get session cookie
    const loginRes = await fetch('https://cronometer.com/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://cronometer.com',
        'Referer': 'https://cronometer.com/',
      },
      body: new URLSearchParams({ username: email, password }),
      redirect: 'manual',
    })

    const setCookie = loginRes.headers.get('set-cookie') ?? ''
    if (!setCookie) {
      // Try JSON login endpoint
      const jsonLoginRes = await fetch('https://cronometer.com/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        },
        body: JSON.stringify({ email, password }),
      })
      if (!jsonLoginRes.ok) {
        const txt = await jsonLoginRes.text()
        return new Response(JSON.stringify({ error: 'Login failed', detail: txt.slice(0, 200) }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Extract session cookies
    const cookies = setCookie.split(/,(?=[^ ].*?=)/).map(c => c.split(';')[0].trim()).join('; ')

    // Step 2: Fetch diary for target date
    const [year, month, day] = targetDate.split('-').map(Number)
    const diaryRes = await fetch(
      `https://cronometer.com/api/diary?date=${targetDate}&_=${Date.now()}`,
      {
        headers: {
          'Cookie': cookies,
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
          'Accept': 'application/json',
          'Referer': `https://cronometer.com/diary/${targetDate}`,
        },
      }
    )

    let macros = null

    if (diaryRes.ok) {
      const data = await diaryRes.json()
      macros = parseDiaryJSON(data, targetDate)
    }

    // Fallback: try GraphQL endpoint
    if (!macros) {
      const gqlRes = await fetch('https://cronometer.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies,
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        },
        body: JSON.stringify({
          query: `query GetDiary($date: String!) {
            diary(date: $date) {
              calories protein carbohydrates fat
            }
          }`,
          variables: { date: targetDate },
        }),
      })
      if (gqlRes.ok) {
        const gqlData = await gqlRes.json()
        const d = gqlData?.data?.diary
        if (d) {
          macros = {
            date: targetDate,
            calories: Math.round(d.calories || 0),
            protein_g: Math.round((d.protein || 0) * 10) / 10,
            carbs_g: Math.round((d.carbohydrates || 0) * 10) / 10,
            fat_g: Math.round((d.fat || 0) * 10) / 10,
            notes: 'Cronometer auto-sync',
          }
        }
      }
    }

    // Fallback: scrape the HTML diary page
    if (!macros) {
      const htmlRes = await fetch(`https://cronometer.com/diary/${targetDate}`, {
        headers: {
          'Cookie': cookies,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
      })
      if (htmlRes.ok) {
        const html = await htmlRes.text()
        macros = parseHTMLDiary(html, targetDate)
      }
    }

    if (!macros) {
      return new Response(JSON.stringify({ error: 'Could not parse diary data. Login may have failed or diary is empty.' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { error } = await supabase.from('macros').upsert([macros], { onConflict: 'date' })
    if (error) throw error

    return new Response(
      JSON.stringify({ ok: true, date: targetDate, macros, synced_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function parseDiaryJSON(data: any, date: string) {
  // Handle various response shapes
  const summary = data?.summary ?? data?.nutritionSummary ?? data?.totals ?? data
  if (!summary) return null
  const cal = summary.calories ?? summary.energy ?? summary.kcal
  if (!cal) return null
  return {
    date,
    calories: Math.round(parseFloat(cal) || 0),
    protein_g: Math.round((parseFloat(summary.protein ?? summary.protein_g ?? 0)) * 10) / 10,
    carbs_g: Math.round((parseFloat(summary.carbohydrates ?? summary.carbs ?? summary.carbs_g ?? 0)) * 10) / 10,
    fat_g: Math.round((parseFloat(summary.fat ?? summary.fat_g ?? 0)) * 10) / 10,
    notes: 'Cronometer auto-sync',
  }
}

function parseHTMLDiary(html: string, date: string) {
  // Look for nutrition summary numbers in embedded JSON/data
  const jsonMatch = html.match(/"energy"\s*:\s*([\d.]+).*?"protein"\s*:\s*([\d.]+).*?"carbohydrates"\s*:\s*([\d.]+).*?"fat"\s*:\s*([\d.]+)/s)
  if (jsonMatch) {
    return {
      date,
      calories: Math.round(parseFloat(jsonMatch[1])),
      protein_g: Math.round(parseFloat(jsonMatch[2]) * 10) / 10,
      carbs_g: Math.round(parseFloat(jsonMatch[3]) * 10) / 10,
      fat_g: Math.round(parseFloat(jsonMatch[4]) * 10) / 10,
      notes: 'Cronometer auto-sync',
    }
  }
  return null
}

function yesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}
