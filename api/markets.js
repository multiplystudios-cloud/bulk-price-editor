const { shopifyGraphQL } = require('./_shopify');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const data = await shopifyGraphQL(`
      query {
        markets(first: 50) {
          nodes {
            id
            name
            primary
            enabled
            priceList {
              id
              currency { currencyCode }
            }
          }
        }
      }
    `);
    return res.json({ markets: data.markets.nodes });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
