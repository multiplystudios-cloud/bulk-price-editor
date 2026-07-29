const { shopifyGraphQL } = require('./_shopify');
const { supabaseQuery } = require('./_supabase');

async function updatePriceList(priceListId, prices) {
  // prices: [{ variantId, price, compareAtPrice, currencyCode }]
  const input = prices.map(p => ({
    variantId: p.variantId,
    price: { amount: p.newPrice.toFixed(2), currencyCode: p.currencyCode },
    compareAtPrice: p.compareAtPrice
      ? { amount: p.compareAtPrice.toFixed(2), currencyCode: p.currencyCode }
      : null
  }));

  const data = await shopifyGraphQL(`
    mutation PriceListFixedPricesAdd($priceListId: ID!, $prices: [PriceListPriceInput!]!) {
      priceListFixedPricesAdd(priceListId: $priceListId, prices: $prices) {
        prices { variant { id } price { amount } }
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
    const { jobTitle, collectionId, collectionTitle, discountPct, variants, markets } = req.body;

    // Create job record in Supabase
    const [job] = await supabaseQuery('price_jobs', 'POST', {
      title: jobTitle || `${discountPct}% off ${collectionTitle}`,
      collection_id: collectionId,
      collection_title: collectionTitle,
      discount_pct: discountPct,
      markets: markets.map(m => m.name),
      status: 'applied',
      variant_count: variants.length
    });

    // Store original prices + apply new ones per market
    const jobVariants = [];
    for (const variant of variants) {
      for (const mp of variant.markets) {
        jobVariants.push({
          job_id: job.id,
          variant_id: variant.variantId,
          product_title: variant.productTitle,
          variant_title: variant.variantTitle,
          market_id: mp.marketId,
          market_name: mp.marketName,
          price_list_id: mp.priceListId,
          currency_code: mp.currencyCode,
          original_price: mp.currentPrice,
          original_compare_at: mp.compareAtPrice,
          new_price: mp.newPrice
        });
      }
    }

    // Insert original prices in batches of 100
    for (let i = 0; i < jobVariants.length; i += 100) {
      await supabaseQuery('price_job_variants', 'POST', jobVariants.slice(i, i + 100));
    }

    // Apply price changes per price list
    const byPriceList = {};
    for (const variant of variants) {
      for (const mp of variant.markets) {
        if (!byPriceList[mp.priceListId]) byPriceList[mp.priceListId] = [];
        byPriceList[mp.priceListId].push({
          variantId: variant.variantId,
          newPrice: mp.newPrice,
          compareAtPrice: mp.compareAtPrice,
          currencyCode: mp.currencyCode
        });
      }
    }

    for (const [priceListId, prices] of Object.entries(byPriceList)) {
      // Shopify accepts up to 250 per call
      for (let i = 0; i < prices.length; i += 250) {
        await updatePriceList(priceListId, prices.slice(i, i + 250));
      }
    }

    return res.json({ ok: true, jobId: job.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
