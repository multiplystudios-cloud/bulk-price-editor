async function supabaseQuery(path, method = 'GET', body = null, extra = '') {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}${extra}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SECRET,
      'Authorization': `Bearer ${process.env.SUPABASE_SECRET}`,
      'Prefer': method === 'POST' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : null
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

module.exports = { supabaseQuery };
