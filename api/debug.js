const { shopifyGraphQL } = require('./_shopify');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const results = {};

  // Test 1: basic shop query (needs no special scopes)
  try {
    const data = await shopifyGraphQL(`{ shop { name myshopifyDomain plan { displayName } } }`);
    results.shop = { ok: true, data: data.shop };
  } catch (err) {
    results.shop = { ok: false, error: err.message };
  }

  // Test 2: collections (needs read_products)
  try {
    const data = await shopifyGraphQL(`{ collections(first: 1) { nodes { id title } } }`);
    results.collections = { ok: true, count: data.collections.nodes.length };
  } catch (err) {
    results.collections = { ok: false, error: err.message };
  }

  // Test 3: markets (needs read_markets)
  try {
    const data = await shopifyGraphQL(`{ markets(first: 1) { nodes { id name } } }`);
    results.markets = { ok: true, count: data.markets.nodes.length };
  } catch (err) {
    results.markets = { ok: false, error: err.message };
  }

  // Test 4: price lists (needs read_markets)
  try {
    const data = await shopifyGraphQL(`{ priceLists(first: 1) { nodes { id name currency { currencyCode } } } }`);
    results.priceLists = { ok: true, count: data.priceLists.nodes.length };
  } catch (err) {
    results.priceLists = { ok: false, error: err.message };
  }

  return res.json({
    env: {
      SHOPIFY_STORE: process.env.SHOPIFY_STORE || '(not set)',
      SHOPIFY_TOKEN: process.env.SHOPIFY_TOKEN ? `${process.env.SHOPIFY_TOKEN.slice(0, 8)}...` : '(not set)',
      SUPABASE_URL: process.env.SUPABASE_URL || '(not set)',
    },
    results
  });
};
