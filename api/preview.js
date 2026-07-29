const { shopifyGraphQL } = require('./_shopify');

async function getCollectionVariants(collectionId) {
  const query = `
    query GetCollectionProducts($id: ID!, $cursor: String) {
      collection(id: $id) {
        title
        products(first: 250, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id title featuredImage { url }
            variants(first: 100) {
              nodes { id title price compareAtPrice }
            }
          }
        }
      }
    }
  `;
  let variants = [];
  let cursor = null;
  let collectionTitle = '';
  do {
    const data = await shopifyGraphQL(query, { id: collectionId, cursor });
    const col = data.collection;
    if (!col) throw new Error('Collection not found');
    collectionTitle = col.title;
    for (const product of col.products.nodes) {
      for (const variant of product.variants.nodes) {
        variants.push({
          variantId: variant.id,
          productId: product.id,
          productTitle: product.title,
          variantTitle: variant.title,
          image: product.featuredImage ? product.featuredImage.url : null,
          price: parseFloat(variant.price),
          compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null
        });
      }
    }
    cursor = col.products.pageInfo.hasNextPage ? col.products.pageInfo.endCursor : null;
  } while (cursor);
  return { variants, collectionTitle };
}

async function getMarketPrices(priceListId, variantIds) {
  const priceMap = {};
  let cursor = null;
  do {
    const data = await shopifyGraphQL(`
      query GetPriceListPrices($id: ID!, $cursor: String) {
        priceList(id: $id) {
          prices(first: 250, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes {
              variant { id }
              price { amount currencyCode }
              compareAtPrice { amount currencyCode }
            }
          }
        }
      }
    `, { id: priceListId, cursor });
    const pl = data.priceList;
    if (!pl) break;
    for (const node of pl.prices.nodes) {
      priceMap[node.variant.id] = {
        price: parseFloat(node.price.amount),
        compareAtPrice: node.compareAtPrice ? parseFloat(node.compareAtPrice.amount) : null,
        currencyCode: node.price.currencyCode
      };
    }
    cursor = pl.prices.pageInfo.hasNextPage ? pl.prices.pageInfo.endCursor : null;
  } while (cursor);
  return priceMap;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { collectionId, discountPct, markets } = req.body;
    if (!collectionId || !discountPct) return res.status(400).json({ error: 'Missing params' });

    const { variants, collectionTitle } = await getCollectionVariants(collectionId);

    // Build preview per variant per market
    const results = [];
    for (const variant of variants) {
      const marketPreviews = [];
      for (const market of markets) {
        if (!market.priceListId) continue;
        const priceMap = await getMarketPrices(market.priceListId, [variant.variantId]);
        const current = priceMap[variant.variantId];
        const rpp = current ? current.compareAtPrice || current.price : variant.compareAtPrice || variant.price;
        const newPrice = Math.round(rpp * (1 - discountPct / 100) * 100) / 100;
        const currency = current ? current.currencyCode : 'AUD';
        marketPreviews.push({
          marketId: market.id,
          marketName: market.name,
          priceListId: market.priceListId,
          currencyCode: currency,
          currentPrice: current ? current.price : variant.price,
          compareAtPrice: rpp,
          newPrice
        });
      }
      results.push({
        variantId: variant.variantId,
        productTitle: variant.productTitle,
        variantTitle: variant.variantTitle,
        image: variant.image,
        markets: marketPreviews
      });
    }

    return res.json({ collectionTitle, variants: results, total: results.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
