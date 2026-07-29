const { supabaseQuery } = require('./_supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const jobs = await supabaseQuery('price_jobs?order=created_at.desc&limit=50');
    return res.json({ jobs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
