// Lightweight API to validate invitation tokens.
// Tries Supabase Edge Function when env vars are set; otherwise uses a simple local fallback.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ valid: false, reason: 'missing_token' });

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const fnUrl = SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/validate-invite-token';
      const r = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ token }),
      });

      if (!r.ok) {
        return res.status(502).json({ valid: false, reason: 'supabase_function_failed' });
      }
      const data = await r.json();
      return res.status(200).json({ valid: !!(data && (data.valid || data.ok || data.isValid || data.tokenValid)), detail: data });
    }

    // Local fallback validation: accept tokens generated locally or with common prefixes.
    const ok = typeof token === 'string' && (token.startsWith('local_') || token.startsWith('invite_') || token.length >= 10);
    return res.status(200).json({ valid: ok, reason: ok ? 'local_accepted' : 'invalid_token' });
  } catch (e) {
    console.error('validate-invite error', e);
    res.status(500).json({ valid: false, error: e.message });
  }
}
