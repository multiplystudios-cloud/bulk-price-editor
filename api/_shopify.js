async function shopifyGraphQL(query, variables = {}) {
  const store = process.env.SHOPIFY_STORE;
  const token = process.env.SHOPIFY_TOKEN;

  if (!store || !token) {
    throw new Error(`Missing env vars — SHOPIFY_STORE: ${!!store}, SHOPIFY_TOKEN: ${!!token}`);
  }

  const res = await fetch(
    `https://${store}/admin/api/2024-10/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token
      },
      body: JSON.stringify({ query, variables })
    }
  );

  const json = await res.json();
  if (json.errors) {
    console.error('Shopify GraphQL error:', JSON.stringify(json.errors));
    throw new Error(json.errors[0].message);
  }
  return json.data;
}

module.exports = { shopifyGraphQL };
