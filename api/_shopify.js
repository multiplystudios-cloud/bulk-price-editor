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

  const text = await res.text();
  console.log('Shopify HTTP status:', res.status);

  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    console.error('Shopify non-JSON response:', text.slice(0, 500));
    throw new Error(`Shopify returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }

  if (json.errors) {
    const errMsg = Array.isArray(json.errors)
      ? json.errors[0].message
      : String(json.errors);
    console.error('Shopify GraphQL errors:', JSON.stringify(json.errors));
    throw new Error(errMsg);
  }

  if (!json.data) {
    console.error('Shopify unexpected response:', JSON.stringify(json));
    throw new Error(`Shopify unexpected response (HTTP ${res.status})`);
  }

  return json.data;
}

module.exports = { shopifyGraphQL };
