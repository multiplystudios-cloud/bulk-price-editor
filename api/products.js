const { shopifyGraphQL } = require('./_shopify');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const search = req.query.search || '';
    const query = search
      ? `title:*${search}* OR variants.title:*${search}*`
      : '';

    const data = await shopifyGraphQL(`
      query SearchProducts($query: String!) {
        products(first: 50, query: $query, sortKey: TITLE) {
          nodes {
            id title
            featuredImage { url }
            variants(first: 100) {
              nodes { id title price compareAtPrice }
            }
          }
        }
      }
    `, { query });

    return res.json({ products: data.products.nodes });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
