const { shopifyGraphQL } = require('./_shopify');
const { supabaseQuery } = require('./_supabase');

async function restorePriceList(priceListId, prices) {
  const input = prices.map(p => ({
    variantId: p.variant_id,
    price: { amount: parseFloat(p.original_price).toFixed(2), currencyCode: p.currency_code },
    compareAtPrice: p.original_compare_at
      ? { amount: parseFloat(p.original_compare_at).toFixed(2), currencyCode: p.currency_code }
      : null
  }));

  const data = await shopifyGraphQL(`
    mutation PriceListFixedPricesAdd($priceListId: ID!, $prices: [PriceListPriceInput!]!) {
      priceListFixedPricesAdd(priceListId: $priceListId, prices: $prices) {
        prices { variant { id } }
        userErrors { field message }
      }
    }
  `, { priceListId, prices: input });

  const errors = data.priceListFixedPricesAdd.userErrors;
  if (errors.length) throw new Error(errors[0].message);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: 'Missing jobId' });

    const variants = await supabaseQuery(`price_job_variants?job_id=eq.${jobId}`);
    if (!variants.length) return res.status(404).json({ error: 'Job variants not found' });

    const byPriceList = {};
    for (const v of variants) {
      if (!byPriceList[v.price_list_id]) byPriceList[v.price_list_id] = [];
      byPriceList[v.price_list_id].push(v);
    }

    for (const [priceListId, prices] of Object.entries(byPriceList)) {
      for (let i = 0; i < prices.length; i += 250) {
        await restorePriceList(priceListId, prices.slice(i, i + 250));
      }
    }

    await supabaseQuery(`price_jobs?id=eq.${jobId}`, 'PATCH', { status: 'reverted' });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
