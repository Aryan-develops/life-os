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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get stored refresh token
  const { data: setting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'gmail_refresh_token')
    .single()

  if (!setting?.value) {
    return new Response(JSON.stringify({ error: 'Gmail not connected. Go to Integrations and click Connect Gmail.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const body = await req.json().catch(() => ({}))
  const targetDate = body.date ?? yesterday()

  try {
    // Get fresh access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        refresh_token: setting.value,
        grant_type: 'refresh_token',
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      return new Response(JSON.stringify({ error: 'Failed to refresh Gmail token. Reconnect Gmail in Integrations.', detail: tokenData }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const accessToken = tokenData.access_token

    // Search Gmail for Cronometer daily summary email for the target date
    const dateObj = new Date(targetDate)
    const after = Math.floor(dateObj.getTime() / 1000)
    const before = after + 86400

    const query = `from:cronometer.com subject:summary after:${after} before:${before}`
    const searchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=5`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const searchData = await searchRes.json()

    // Also try broader search if nothing found
    let messages = searchData.messages ?? []
    if (!messages.length) {
      const broadQuery = `from:cronometer after:${after} before:${before}`
      const broadRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(broadQuery)}&maxResults=10`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const broadData = await broadRes.json()
      messages = broadData.messages ?? []
    }

    if (!messages.length) {
      return new Response(JSON.stringify({
        error: `No Cronometer email found for ${targetDate}. Make sure Daily Summary emails are enabled in Cronometer Settings → Notifications.`,
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Fetch the first matching email
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messages[0].id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const msgData = await msgRes.json()

    // Extract email body
    const emailBody = extractBody(msgData)
    const macros = parseEmailBody(emailBody, targetDate)

    if (!macros) {
      return new Response(JSON.stringify({
        error: 'Found Cronometer email but could not parse nutrition data.',
        preview: emailBody.slice(0, 500),
      }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { error: dbError } = await supabase
      .from('macros')
      .upsert([macros], { onConflict: 'date' })
    if (dbError) throw dbError

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

function extractBody(msgData: any): string {
  const parts = msgData.payload?.parts ?? []
  // Try to get HTML part first, then plain text
  for (const part of parts) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
    }
  }
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
    }
  }
  // Flat body
  if (msgData.payload?.body?.data) {
    return atob(msgData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))
  }
  // Nested multipart
  for (const part of parts) {
    for (const sub of part.parts ?? []) {
      if (sub.body?.data) {
        return atob(sub.body.data.replace(/-/g, '+').replace(/_/g, '/'))
      }
    }
  }
  return ''
}

function parseEmailBody(body: string, date: string) {
  // Strip HTML tags for easier parsing
  const text = body.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')

  // Pattern 1: "Calories 2,450" or "Energy 2450 kcal"
  const calMatch = text.match(/(?:calories?|energy)[:\s]+([0-9,]+)\s*(?:kcal|cal)?/i)
  const protMatch = text.match(/protein[:\s]+([0-9.]+)\s*g/i)
  const carbMatch = text.match(/carb(?:ohydrates?)?[:\s]+([0-9.]+)\s*g/i)
  const fatMatch = text.match(/fat[:\s]+([0-9.]+)\s*g/i)

  const calories = calMatch ? parseInt(calMatch[1].replace(/,/g, '')) : null
  const protein_g = protMatch ? parseFloat(protMatch[1]) : null
  const carbs_g = carbMatch ? parseFloat(carbMatch[1]) : null
  const fat_g = fatMatch ? parseFloat(fatMatch[1]) : null

  if (!calories) return null

  return { date, calories, protein_g, carbs_g, fat_g, notes: 'Gmail/Cronometer auto-sync' }
}

function yesterday(): string {
  const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]
}
