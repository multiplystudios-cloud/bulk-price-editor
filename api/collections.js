const { shopifyGraphQL } = require('./_shopify');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const query = `
      query GetCollections($cursor: String) {
        collections(first: 250, after: $cursor, sortKey: TITLE) {
          pageInfo { hasNextPage endCursor }
          nodes { id title handle productsCount { count } }
        }
      }
    `;
    let collections = [];
    let cursor = null;
    do {
      const data = await shopifyGraphQL(query, { cursor });
      collections = collections.concat(data.collections.nodes);
      cursor = data.collections.pageInfo.hasNextPage ? data.collections.pageInfo.endCursor : null;
    } while (cursor);

    return res.json({ collections });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
