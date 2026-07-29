async function shopifyGraphQL(query, variables = {}) {
  const res = await fetch(
    `https://${process.env.SHOPIFY_STORE}/admin/api/2024-10/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN
      },
      body: JSON.stringify({ query, variables })
    }
  );
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

module.exports = { shopifyGraphQL };
