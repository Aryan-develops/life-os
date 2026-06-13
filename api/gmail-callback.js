export default async function handler(req, res) {
  const { code, error } = req.query

  if (error) {
    return res.redirect('/?gmail_error=' + encodeURIComponent(error))
  }

  if (!code) {
    return res.status(400).send('No code received')
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GMAIL_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()
    if (!tokens.refresh_token) {
      return res.redirect('/integrations?gmail_error=no_refresh_token')
    }

    // Store refresh token in Supabase
    const supaRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/app_settings`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({ key: 'gmail_refresh_token', value: tokens.refresh_token }),
      }
    )

    if (!supaRes.ok) {
      const err = await supaRes.text()
      return res.redirect('/integrations?gmail_error=' + encodeURIComponent('DB error: ' + err.slice(0, 100)))
    }

    res.redirect('/integrations?gmail_connected=1')
  } catch (err) {
    res.redirect('/integrations?gmail_error=' + encodeURIComponent(err.message))
  }
}
