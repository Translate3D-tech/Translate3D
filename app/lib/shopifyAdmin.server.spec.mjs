import { afterEach, expect, test } from 'bun:test';
import { shopifyAdminGraphql, updateAdminProduct } from './shopifyAdmin.server';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('renews and caches an Admin API token for concurrent requests', async () => {
  const requests = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith('/admin/oauth/access_token')) {
      return Response.json({ access_token: 'temporary-token', expires_in: 86399 });
    }
    return Response.json({ data: { shop: { name: 'Translate3D' } } });
  };

  const env = {
    PUBLIC_STORE_DOMAIN: 'translate3d.myshopify.com',
    SHOPIFY_ADMIN_API_CLIENT_ID: 'cache-test-client',
    SHOPIFY_ADMIN_API_CLIENT_SECRET: 'test-secret',
  };

  const results = await Promise.all([
    shopifyAdminGraphql(env, '{ shop { name } }'),
    shopifyAdminGraphql(env, '{ shop { name } }'),
  ]);
  await shopifyAdminGraphql(env, '{ shop { name } }');

  expect(results).toEqual([{ shop: { name: 'Translate3D' } }, { shop: { name: 'Translate3D' } }]);
  expect(requests.filter(({ url }) => url.endsWith('/admin/oauth/access_token'))).toHaveLength(1);
  const graphqlRequests = requests.filter(({ url }) => url.endsWith('/admin/api/2026-01/graphql.json'));
  expect(graphqlRequests).toHaveLength(3);
  expect(graphqlRequests[0]?.init?.headers).toMatchObject({
    'X-Shopify-Access-Token': 'temporary-token',
  });
});

test('uses an existing Admin API token without exchanging credentials', async () => {
  const urls = [];
  globalThis.fetch = async (input) => {
    urls.push(String(input));
    return Response.json({ data: { shop: { name: 'Translate3D' } } });
  };

  const env = {
    PUBLIC_STORE_DOMAIN: 'translate3d.myshopify.com',
    SHOPIFY_ADMIN_API_ACCESS_TOKEN: 'existing-token',
  };

  await shopifyAdminGraphql(env, '{ shop { name } }');
  expect(urls).toEqual(['https://translate3d.myshopify.com/admin/api/2026-01/graphql.json']);
});

test('rejects an invalid token-exchange domain before making a request', async () => {
  globalThis.fetch = async () => {
    throw new Error('Network request should not be made');
  };

  const env = {
    PUBLIC_STORE_DOMAIN: 'translate-3d.com',
    SHOPIFY_ADMIN_API_CLIENT_ID: 'domain-test-client',
    SHOPIFY_ADMIN_API_CLIENT_SECRET: 'test-secret',
  };

  await expect(shopifyAdminGraphql(env, '{ shop { name } }')).rejects.toThrow('myshopify.com');
});

test('compares the current inventory quantity before setting stock', async () => {
  const requests = [];
  globalThis.fetch = async (_input, init) => {
    const { query, variables } = JSON.parse(init.body);
    requests.push({ query, variables });
    if (query.includes('AdminProductUpdate')) {
      return Response.json({ data: { productUpdate: { product: { id: 'product-1' }, userErrors: [] } } });
    }
    if (query.includes('AdminProductVariantUpdate')) {
      return Response.json({ data: { productVariantsBulkUpdate: { productVariants: [{ id: 'variant-1' }], userErrors: [] } } });
    }
    if (query.includes('VariantInventoryItem')) {
      return Response.json({ data: { productVariant: { inventoryItem: { id: 'item-1', inventoryLevel: { quantities: [{ quantity: 4 }] } } } } });
    }
    return Response.json({ data: { inventorySetQuantities: { userErrors: [] } } });
  };

  const env = {
    PUBLIC_STORE_DOMAIN: 'translate3d.myshopify.com',
    SHOPIFY_ADMIN_API_ACCESS_TOKEN: 'existing-token',
  };
  await updateAdminProduct(env, {
    productId: 'product-1',
    title: 'Test product',
    variantId: 'variant-1',
    locationId: 'location-1',
    inventoryQuantity: 5,
  });

  expect(requests).toHaveLength(4);
  expect(requests[3]?.variables.input.quantities).toEqual([{
    inventoryItemId: 'item-1',
    locationId: 'location-1',
    quantity: 5,
    changeFromQuantity: 4,
  }]);
});
