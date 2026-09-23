import {
  createOrderTrackingReference,
  isValidOrderTrackingReference,
} from '~/lib/orderTracking.server';

function normalizeDomain(domain?: string) {
  return (domain ?? '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

type AdminGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export async function shopifyAdminGraphql<TData>(
  env: Env,
  query: string,
  variables?: Record<string, unknown>,
): Promise<TData> {
  const envValues = env as unknown as Record<string, string | undefined>;
  const domain = normalizeDomain(envValues.SHOPIFY_STORE_DOMAIN || env.PUBLIC_STORE_DOMAIN);
  const token = envValues.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
  const apiVersion = envValues.SHOPIFY_ADMIN_API_VERSION || '2025-01';

  if (!domain || !token) {
    throw new Error('Shopify Admin API no esta configurada en env');
  }

  const response = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await response.json()) as AdminGraphqlResponse<TData>;

  if (!response.ok) {
    const message = payload.errors?.map((error) => error.message).join(', ') || response.statusText;
    throw new Error(`Admin API error (${response.status}): ${message}`);
  }

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(', '));
  }

  if (!payload.data) {
    throw new Error('Admin API response sin data');
  }

  return payload.data;
}

export async function isAdminCustomer(env: Env, customerId: string) {
  const data = await shopifyAdminGraphql<{
    customer: { tags: string[] } | null;
  }>(
    env,
    `
      query CustomerTags($id: ID!) {
        customer(id: $id) {
          tags
        }
      }
    `,
    { id: customerId },
  );

  const tags = (data.customer?.tags ?? []).map((tag) => tag.toLowerCase().trim());
  return tags.includes('admin') || tags.includes('administrador');
}

export type AdminOrderSummary = {
  id: string;
  name: string;
  confirmationNumber: string;
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  totalAmount: string;
  currencyCode: string;
  customerName: string;
  customerEmail: string;
  tags: string[];
  lineItems: Array<{
    title: string;
    quantity: number;
    imageUrl: string;
    imageAlt: string;
  }>;
};

export type AdminTrackedOrder = {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  totalAmount: string;
  currencyCode: string;
  trackingReference?: string;
};

export type AdminOrderDetails = {
  id: string;
  name: string;
  tags: string[];
  confirmationNumber: string;
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  currencyCode: string;
  totalAmount: string;
  subtotalAmount: string;
  totalTaxAmount: string;
  totalShippingAmount: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: {
    name: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    zip: string;
    country: string;
  } | null;
  billingAddress: {
    name: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    zip: string;
    country: string;
  } | null;
  lineItems: Array<{
    id: string;
    title: string;
    variantTitle: string;
    quantity: number;
    imageUrl: string;
    imageAlt: string;
    unitAmount: string;
  }>;
};

export type AdminBlogPostSummary = {
  id: string;
  title: string;
  handle: string;
  blogTitle: string;
  publishedAt: string | null;
  updatedAt: string;
  authorName: string;
  adminEditUrl: string;
  publicUrl: string;
};

export type AdminCatalogProductSummary = {
  id: string;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  productType: string;
  updatedAt: string;
  tags: string[];
  onlineStoreUrl: string;
  variant: {
    id: string;
    title: string;
    sku: string;
    price: string;
    compareAtPrice: string;
    inventoryQuantity: number | null;
    inventoryItemId: string | null;
  } | null;
};

export type AdminPublicationSummary = {
  id: string;
  name: string;
};

export type AdminCatalogProductDetail = {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  status: string;
  vendor: string;
  productType: string;
  updatedAt: string;
  tags: string[];
  onlineStoreUrl: string;
  collections: Array<{
    id: string;
    title: string;
    handle: string;
  }>;
  variants: Array<{
    id: string;
    title: string;
    sku: string;
    barcode: string;
    price: string;
    compareAtPrice: string;
    inventoryQuantity: number | null;
  }>;
};

export async function listAdminOrders(
  env: Env,
  options?: {
    first?: number;
  },
) {
  const first = options?.first ?? 100;

  const data = await shopifyAdminGraphql<{
    orders: {
      nodes: Array<{
        id: string;
        name: string;
        confirmationNumber: string | null;
        createdAt: string;
        displayFinancialStatus: string;
        displayFulfillmentStatus: string;
        tags: string[];
        currentTotalPriceSet: {
          shopMoney: {
            amount: string;
            currencyCode: string;
          };
        };
        customer: {
          displayName: string | null;
          email: string | null;
        } | null;
        lineItems: {
          nodes: Array<{
            title: string;
            quantity: number;
            image: {
              url: string;
              altText: string | null;
            } | null;
          }>;
        };
      }>;
    };
  }>(
    env,
    `
      query AdminOrders($first: Int!) {
        orders(first: $first, sortKey: CREATED_AT, reverse: true) {
          nodes {
            id
            name
            confirmationNumber
            createdAt
            displayFinancialStatus
            displayFulfillmentStatus
            tags
            currentTotalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            customer {
              displayName
              email
            }
            lineItems(first: 5) {
              nodes {
                title
                quantity
                image {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    `,
    { first },
  );

  return data.orders.nodes.map((order) => ({
    id: order.id,
    name: order.name,
    confirmationNumber: order.confirmationNumber || '',
    createdAt: order.createdAt,
    displayFinancialStatus: order.displayFinancialStatus,
    displayFulfillmentStatus: order.displayFulfillmentStatus,
    totalAmount: order.currentTotalPriceSet.shopMoney.amount,
    currencyCode: order.currentTotalPriceSet.shopMoney.currencyCode,
    customerName: order.customer?.displayName || 'Sin nombre',
    customerEmail: order.customer?.email || '',
    tags: order.tags ?? [],
    lineItems: order.lineItems.nodes.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      imageUrl: item.image?.url || '',
      imageAlt: item.image?.altText || item.title,
    })),
  }));
}

function buildOrderSearchCandidates(rawReference: string) {
  const trimmed = rawReference.trim();
  if (!trimmed) return [];

  const withoutHash = trimmed.replace(/^#/, '');
  const normalized = withoutHash.toUpperCase();
  const numericOnly = /^\d+$/.test(withoutHash);

  const candidates = new Set<string>();

  if (numericOnly) {
    candidates.add(`name:#${withoutHash}`);
    candidates.add(`name:${withoutHash}`);
  } else {
    candidates.add(`name:${trimmed}`);
    candidates.add(`name:${normalized}`);
    candidates.add(`name:#${withoutHash}`);
    candidates.add(`name:${withoutHash}`);
  }

  return Array.from(candidates);
}

export async function findAdminOrderByReference(env: Env, reference: string) {
  const searchCandidates = buildOrderSearchCandidates(reference);
  if (searchCandidates.length === 0) return null;

  for (const search of searchCandidates) {
    const data = await shopifyAdminGraphql<{
      orders: {
        nodes: Array<{
          id: string;
          name: string;
          createdAt: string;
          displayFinancialStatus: string;
          displayFulfillmentStatus: string;
          currentTotalPriceSet: {
            shopMoney: {
              amount: string;
              currencyCode: string;
            };
          };
        }>;
      };
    }>(
      env,
      `
        query TrackOrderByReference($query: String!) {
          orders(first: 1, query: $query, sortKey: CREATED_AT, reverse: true) {
            nodes {
              id
              name
              createdAt
              displayFinancialStatus
              displayFulfillmentStatus
              currentTotalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      `,
      { query: search },
    );

    const order = data.orders.nodes[0];
    if (order) {
      return {
        id: order.id,
        name: order.name,
        createdAt: order.createdAt,
        displayFinancialStatus: order.displayFinancialStatus,
        displayFulfillmentStatus: order.displayFulfillmentStatus,
        totalAmount: order.currentTotalPriceSet.shopMoney.amount,
        currencyCode: order.currentTotalPriceSet.shopMoney.currencyCode,
      } satisfies AdminTrackedOrder;
    }
  }

  return null;
}

export async function findAdminOrderByTrackingReference(
  env: Env,
  reference: string,
  options?: { first?: number },
) {
  const normalizedReference = reference.trim();
  if (!isValidOrderTrackingReference(normalizedReference)) {
    return null;
  }

  const first = options?.first ?? 250;

  const data = await shopifyAdminGraphql<{
    orders: {
      nodes: Array<{
        id: string;
        name: string;
        createdAt: string;
        displayFinancialStatus: string;
        displayFulfillmentStatus: string;
        currentTotalPriceSet: {
          shopMoney: {
            amount: string;
            currencyCode: string;
          };
        };
      }>;
    };
  }>(
    env,
    `
      query TrackOrderByToken($first: Int!) {
        orders(first: $first, sortKey: CREATED_AT, reverse: true) {
          nodes {
            id
            name
            createdAt
            displayFinancialStatus
            displayFulfillmentStatus
            currentTotalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
          }
        }
      }
    `,
    { first },
  );

  for (const order of data.orders.nodes) {
    const orderReference = await createOrderTrackingReference(env, order.id);
    if (orderReference !== normalizedReference) continue;

    return {
      id: order.id,
      name: order.name,
      createdAt: order.createdAt,
      displayFinancialStatus: order.displayFinancialStatus,
      displayFulfillmentStatus: order.displayFulfillmentStatus,
      totalAmount: order.currentTotalPriceSet.shopMoney.amount,
      currencyCode: order.currentTotalPriceSet.shopMoney.currencyCode,
      trackingReference: orderReference,
    } satisfies AdminTrackedOrder;
  }

  return null;
}

export async function getAdminOrderDetails(env: Env, orderId: string) {
  const normalizedOrderId = orderId.trim();
  if (!normalizedOrderId) return null;

  const data = await shopifyAdminGraphql<{
    order: {
      id: string;
      name: string;
      tags: string[];
      confirmationNumber: string | null;
      createdAt: string;
      displayFinancialStatus: string;
      displayFulfillmentStatus: string;
      currentTotalPriceSet: {
        shopMoney: {
          amount: string;
          currencyCode: string;
        };
      };
      currentSubtotalPriceSet: {
        shopMoney: {
          amount: string;
          currencyCode: string;
        };
      };
      currentTotalTaxSet: {
        shopMoney: {
          amount: string;
          currencyCode: string;
        };
      };
      totalShippingPriceSet: {
        shopMoney: {
          amount: string;
          currencyCode: string;
        };
      };
      customer: {
        displayName: string | null;
        email: string | null;
      } | null;
      shippingAddress: {
        name: string | null;
        address1: string | null;
        address2: string | null;
        city: string | null;
        province: string | null;
        zip: string | null;
        country: string | null;
      } | null;
      billingAddress: {
        name: string | null;
        address1: string | null;
        address2: string | null;
        city: string | null;
        province: string | null;
        zip: string | null;
        country: string | null;
      } | null;
      lineItems: {
        nodes: Array<{
          id: string;
          title: string;
          quantity: number;
          variantTitle: string | null;
          image: {
            url: string;
            altText: string | null;
          } | null;
          originalUnitPriceSet: {
            shopMoney: {
              amount: string;
              currencyCode: string;
            };
          };
        }>;
      };
    } | null;
  }>(
    env,
    `
      query AdminOrderDetail($id: ID!) {
        order(id: $id) {
          id
          name
          tags
          confirmationNumber
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
          currentTotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          currentSubtotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          currentTotalTaxSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalShippingPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          customer {
            displayName
            email
          }
          shippingAddress {
            name
            address1
            address2
            city
            province
            zip
            country
          }
          billingAddress {
            name
            address1
            address2
            city
            province
            zip
            country
          }
          lineItems(first: 100) {
            nodes {
              id
              title
              quantity
              variantTitle
              image {
                url
                altText
              }
              originalUnitPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    `,
    { id: normalizedOrderId },
  );

  if (!data.order) return null;

  return {
    id: data.order.id,
    name: data.order.name,
    tags: data.order.tags ?? [],
    confirmationNumber: data.order.confirmationNumber || '',
    createdAt: data.order.createdAt,
    displayFinancialStatus: data.order.displayFinancialStatus,
    displayFulfillmentStatus: data.order.displayFulfillmentStatus,
    currencyCode: data.order.currentTotalPriceSet.shopMoney.currencyCode,
    totalAmount: data.order.currentTotalPriceSet.shopMoney.amount,
    subtotalAmount: data.order.currentSubtotalPriceSet.shopMoney.amount,
    totalTaxAmount: data.order.currentTotalTaxSet.shopMoney.amount,
    totalShippingAmount: data.order.totalShippingPriceSet.shopMoney.amount,
    customerName: data.order.customer?.displayName || 'Sin nombre',
    customerEmail: data.order.customer?.email || '',
    shippingAddress: data.order.shippingAddress
      ? {
        name: data.order.shippingAddress.name || '',
        address1: data.order.shippingAddress.address1 || '',
        address2: data.order.shippingAddress.address2 || '',
        city: data.order.shippingAddress.city || '',
        province: data.order.shippingAddress.province || '',
        zip: data.order.shippingAddress.zip || '',
        country: data.order.shippingAddress.country || '',
      }
      : null,
    billingAddress: data.order.billingAddress
      ? {
        name: data.order.billingAddress.name || '',
        address1: data.order.billingAddress.address1 || '',
        address2: data.order.billingAddress.address2 || '',
        city: data.order.billingAddress.city || '',
        province: data.order.billingAddress.province || '',
        zip: data.order.billingAddress.zip || '',
        country: data.order.billingAddress.country || '',
      }
      : null,
    lineItems: data.order.lineItems.nodes.map((line) => ({
      id: line.id,
      title: line.title,
      variantTitle: line.variantTitle || '',
      quantity: line.quantity,
      imageUrl: line.image?.url || '',
      imageAlt: line.image?.altText || line.title,
      unitAmount: line.originalUnitPriceSet.shopMoney.amount,
    })),
  } satisfies AdminOrderDetails;
}

function extractShopifyNumericId(gid: string) {
  const parts = gid.split('/');
  return parts[parts.length - 1] || '';
}

async function getCollectionByHandle(env: Env, handle: string) {
  const normalizedHandle = handle.trim();
  if (!normalizedHandle) return null;

  const data = await shopifyAdminGraphql<{
    collections: {
      nodes: Array<{
        id: string;
        title: string;
        handle: string;
      }>;
    };
  }>(
    env,
    `
      query CollectionByHandle($query: String!) {
        collections(first: 1, query: $query) {
          nodes {
            id
            title
            handle
          }
        }
      }
    `,
    {
      query: `handle:${normalizedHandle}`,
    },
  );

  return data.collections.nodes[0] ?? null;
}

export async function listAdminCollectionProducts(
  env: Env,
  collectionHandle: string,
  options?: { first?: number },
) {
  const collection = await getCollectionByHandle(env, collectionHandle);
  if (!collection) {
    return {
      collection: null,
      products: [] as AdminCatalogProductSummary[],
    };
  }

  const first = options?.first ?? 200;
  const data = await shopifyAdminGraphql<{
    collection: {
      id: string;
      title: string;
      handle: string;
      products: {
        nodes: Array<{
          id: string;
          title: string;
          handle: string;
          status: string;
          vendor: string;
          productType: string;
          updatedAt: string;
          tags: string[];
          onlineStoreUrl: string | null;
          variants: {
            nodes: Array<{
              id: string;
              title: string;
              sku: string | null;
              price: string | null;
              compareAtPrice: string | null;
              inventoryQuantity: number | null;
            }>;
          };
        }>;
      };
    } | null;
  }>(
    env,
    `
      query CollectionProducts($id: ID!, $first: Int!) {
        collection(id: $id) {
          id
          title
          handle
          products(first: $first, sortKey: CREATED, reverse: true) {
            nodes {
              id
              title
              handle
              status
              vendor
              productType
              updatedAt
              tags
              onlineStoreUrl
              variants(first: 1) {
                nodes {
                  id
                  title
                  sku
                  price
                  compareAtPrice
                  inventoryQuantity
                }
              }
            }
          }
        }
      }
    `,
    { id: collection.id, first },
  );

  if (!data.collection) {
    return {
      collection: null,
      products: [] as AdminCatalogProductSummary[],
    };
  }

  return {
    collection: {
      id: data.collection.id,
      title: data.collection.title,
      handle: data.collection.handle,
    },
    products: data.collection.products.nodes.map((product) => ({
      id: product.id,
      title: product.title,
      handle: product.handle,
      status: product.status,
      vendor: product.vendor || '',
      productType: product.productType || '',
      updatedAt: product.updatedAt,
      tags: product.tags ?? [],
      onlineStoreUrl: product.onlineStoreUrl || '',
      variant: product.variants.nodes[0]
        ? {
          id: product.variants.nodes[0].id,
          title: product.variants.nodes[0].title,
          sku: product.variants.nodes[0].sku || '',
          price: product.variants.nodes[0].price || '0',
          compareAtPrice: product.variants.nodes[0].compareAtPrice || '',
          inventoryQuantity: product.variants.nodes[0].inventoryQuantity,
        }
        : null,
    })),
  };
}

export async function getAdminProductDetails(env: Env, productId: string) {
  const normalizedProductId = productId.trim();
  if (!normalizedProductId) return null;

  const data = await shopifyAdminGraphql<{
    product: {
      id: string;
      title: string;
      handle: string;
      descriptionHtml: string;
      status: string;
      vendor: string;
      productType: string;
      updatedAt: string;
      tags: string[];
      onlineStoreUrl: string | null;
      collections: {
        nodes: Array<{
          id: string;
          title: string;
          handle: string;
        }>;
      };
      variants: {
        nodes: Array<{
          id: string;
          title: string;
          sku: string | null;
          barcode: string | null;
          price: string | null;
          compareAtPrice: string | null;
          inventoryQuantity: number | null;
        }>;
      };
    } | null;
  }>(
    env,
    `
      query AdminProductDetails($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          descriptionHtml
          status
          vendor
          productType
          updatedAt
          tags
          onlineStoreUrl
          collections(first: 20) {
            nodes {
              id
              title
              handle
            }
          }
          variants(first: 50) {
            nodes {
              id
              title
              sku
              barcode
              price
              compareAtPrice
              inventoryQuantity
            }
          }
        }
      }
    `,
    { id: normalizedProductId },
  );

  if (!data.product) return null;

  return {
    id: data.product.id,
    title: data.product.title,
    handle: data.product.handle,
    descriptionHtml: data.product.descriptionHtml || '',
    status: data.product.status,
    vendor: data.product.vendor || '',
    productType: data.product.productType || '',
    updatedAt: data.product.updatedAt,
    tags: data.product.tags ?? [],
    onlineStoreUrl: data.product.onlineStoreUrl || '',
    collections: data.product.collections.nodes.map((collection) => ({
      id: collection.id,
      title: collection.title,
      handle: collection.handle,
    })),
    variants: data.product.variants.nodes.map((variant) => ({
      id: variant.id,
      title: variant.title,
      sku: variant.sku || '',
      barcode: variant.barcode || '',
      price: variant.price || '0',
      compareAtPrice: variant.compareAtPrice || '',
      inventoryQuantity: variant.inventoryQuantity,
    })),
  } satisfies AdminCatalogProductDetail;
}

export async function updateAdminProduct(
  env: Env,
  input: {
    productId: string;
    title: string;
    handle?: string;
    descriptionHtml?: string;
    vendor?: string;
    productType?: string;
    status?: string;
    tags?: string[];
    variantId?: string;
    variantPrice?: string;
    variantCompareAtPrice?: string;
    variantSku?: string;
    variantBarcode?: string;
    inventoryQuantity?: number;
    locationId?: string;
  },
) {
  const productUpdate = await shopifyAdminGraphql<{
    productUpdate: {
      product: { id: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(
    env,
    `
      mutation AdminProductUpdate($product: ProductUpdateInput!) {
        productUpdate(product: $product) {
          product {
            id
          }
          userErrors {
            message
          }
        }
      }
    `,
    {
      product: {
        id: input.productId,
        title: input.title,
        handle: input.handle,
        descriptionHtml: input.descriptionHtml || '',
        vendor: input.vendor || '',
        productType: input.productType || '',
        status: input.status || undefined,
        tags: input.tags ?? [],
      },
    },
  );

  if (productUpdate.productUpdate.userErrors.length > 0) {
    throw new Error(productUpdate.productUpdate.userErrors[0]?.message || 'No se pudo actualizar producto');
  }

  if (input.variantId) {
    const variantsUpdate = await shopifyAdminGraphql<{
      productVariantsBulkUpdate: {
        productVariants: Array<{ id: string }>;
        userErrors: Array<{ message: string }>;
      };
    }>(
      env,
      `
        mutation AdminProductVariantUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants {
              id
            }
            userErrors {
              message
            }
          }
        }
      `,
      {
        productId: input.productId,
        variants: [
          {
            id: input.variantId,
            price: input.variantPrice || undefined,
            compareAtPrice: input.variantCompareAtPrice || null,
            barcode: input.variantBarcode || undefined,
            inventoryItem: {
              sku: input.variantSku || undefined,
            },
          },
        ],
      },
    );

    if (variantsUpdate.productVariantsBulkUpdate.userErrors.length > 0) {
      throw new Error(
        variantsUpdate.productVariantsBulkUpdate.userErrors[0]?.message || 'No se pudo actualizar variante',
      );
    }

    // Update inventory if locationId and quantity are provided
    if (input.locationId && input.inventoryQuantity !== undefined) {
      // First get the inventoryItem id for the variant
      const variantData = await shopifyAdminGraphql<{
        productVariant: {
          inventoryItem: {
            id: string;
          };
        } | null;
      }>(
        env,
        `
          query VariantInventoryItem($id: ID!) {
            productVariant(id: $id) {
              inventoryItem {
                id
              }
            }
          }
        `,
        { id: input.variantId },
      );

      const inventoryItemId = variantData.productVariant?.inventoryItem.id;
      if (inventoryItemId) {
        await shopifyAdminGraphql(
          env,
          `
            mutation InventorySet($input: InventorySetQuantitiesInput!) {
              inventorySetQuantities(input: $input) {
                userErrors {
                  message
                }
              }
            }
          `,
          {
            input: {
              name: 'available',
              reason: 'correction',
              quantities: [
                {
                  inventoryItemId,
                  locationId: input.locationId,
                  quantity: input.inventoryQuantity,
                },
              ],
            },
          },
        );
      }
    }
  }

  return true;
}

export async function toggleAdminProductStatus(env: Env, productId: string, newStatus: 'ACTIVE' | 'DRAFT') {
  const result = await shopifyAdminGraphql<{
    productUpdate: {
      product: { id: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(
    env,
    `
      mutation ToggleProductStatus($product: ProductUpdateInput!) {
        productUpdate(product: $product) {
          product { id }
          userErrors { message }
        }
      }
    `,
    {
      product: {
        id: productId,
        status: newStatus,
      },
    },
  );

  if (result.productUpdate.userErrors.length > 0) {
    throw new Error(result.productUpdate.userErrors[0]?.message || 'No se pudo cambiar el estado del producto');
  }

  return true;
}

export async function archiveAdminProduct(env: Env, productId: string) {
  const result = await shopifyAdminGraphql<{
    productUpdate: {
      product: { id: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(
    env,
    `
      mutation ArchiveProduct($product: ProductUpdateInput!) {
        productUpdate(product: $product) {
          product { id }
          userErrors { message }
        }
      }
    `,
    {
      product: {
        id: productId,
        status: 'ARCHIVED',
      },
    },
  );

  if (result.productUpdate.userErrors.length > 0) {
    throw new Error(result.productUpdate.userErrors[0]?.message || 'No se pudo archivar el producto');
  }

  return true;
}

export async function deleteAdminProduct(env: Env, productId: string) {
  const result = await shopifyAdminGraphql<{
    productDelete: {
      deletedProductId: string | null;
      userErrors: Array<{ message: string }>;
    };
  }>(
    env,
    `
      mutation DeleteProduct($input: ProductDeleteInput!) {
        productDelete(input: $input) {
          deletedProductId
          userErrors { message }
        }
      }
    `,
    {
      input: {
        id: productId,
      },
    },
  );

  if (result.productDelete.userErrors.length > 0) {
    throw new Error(result.productDelete.userErrors[0]?.message || 'No se pudo eliminar el producto');
  }

  return true;
}

export async function listAdminPublications(env: Env) {
  const data = await shopifyAdminGraphql<{
    publications: {
      nodes: Array<{
        id: string;
        name: string;
      }>;
    };
  }>(
    env,
    `
      query AdminPublications {
        publications(first: 20) {
          nodes {
            id
            name
          }
        }
      }
    `,
  );
  return data.publications.nodes;
}

export async function publishProductToChannels(
  env: Env,
  productId: string,
  publicationIds: string[],
) {
  if (publicationIds.length === 0) return;

  const data = await shopifyAdminGraphql<{
    publishablePublish: {
      userErrors: Array<{ message: string }>;
    };
  }>(
    env,
    `
      mutation PublishProduct($id: ID!, $input: [PublicationInput!]!) {
        publishablePublish(id: $id, input: $input) {
          userErrors {
            message
          }
        }
      }
    `,
    {
      id: productId,
      input: publicationIds.map((id) => ({ publicationId: id })),
    },
  );

  if (data.publishablePublish.userErrors.length > 0) {
    throw new Error(data.publishablePublish.userErrors[0]?.message || 'No se pudo publicar producto');
  }
}

export async function listAdminLocations(env: Env) {
  const data = await shopifyAdminGraphql<{
    locations: {
      nodes: Array<{
        id: string;
        name: string;
      }>;
    };
  }>(
    env,
    `
      query AdminLocations {
        locations(first: 10) {
          nodes {
            id
            name
          }
        }
      }
    `,
  );
  return data.locations.nodes;
}

export async function createAdminProduct(
  env: Env,
  input: {
    categoryCollectionHandle: string;
    title: string;
    handle?: string;
    descriptionHtml?: string;
    vendor?: string;
    productType?: string;
    status?: string;
    tags?: string[];
    variantPrice?: string;
    variantCompareAtPrice?: string;
    variantSku?: string;
    variantBarcode?: string;
    images?: Array<{ attachment?: string; src?: string; altText?: string }>;
    inventoryQuantity?: number;
    locationId?: string;
  },
) {
  const collection = await getCollectionByHandle(env, input.categoryCollectionHandle);
  if (!collection) {
    throw new Error('No se encontro la coleccion de categoria');
  }

  const created = await shopifyAdminGraphql<{
    productCreate: {
      product: {
        id: string;
        variants: {
          nodes: Array<{ id: string }>;
        };
      } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(
    env,
    `
      mutation AdminProductCreate($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            variants(first: 1) {
              nodes {
                id
              }
            }
          }
          userErrors {
            message
          }
        }
      }
    `,
    {
      product: {
        title: input.title,
        handle: input.handle || undefined,
        descriptionHtml: input.descriptionHtml || '',
        vendor: input.vendor || '',
        productType: input.productType || '',
        status: input.status || 'DRAFT',
        tags: input.tags ?? [],
        collectionsToJoin: [collection.id],
      },
    },
  );

  if (created.productCreate.userErrors.length > 0) {
    throw new Error(created.productCreate.userErrors[0]?.message || 'No se pudo crear producto');
  }

  const productId = created.productCreate.product?.id;
  if (!productId) {
    throw new Error('No se pudo crear producto');
  }

  const defaultVariantId = created.productCreate.product?.variants.nodes[0]?.id;
  if (defaultVariantId) {
    await updateAdminProduct(env, {
      productId,
      title: input.title,
      handle: input.handle,
      descriptionHtml: input.descriptionHtml,
      vendor: input.vendor,
      productType: input.productType,
      status: input.status || 'DRAFT',
      tags: input.tags,
      variantId: defaultVariantId,
      variantPrice: input.variantPrice,
      variantCompareAtPrice: input.variantCompareAtPrice,
      variantSku: input.variantSku,
      variantBarcode: input.variantBarcode,
      inventoryQuantity: input.inventoryQuantity,
      locationId: input.locationId,
    });
  }

  return {
    productId,
    defaultVariantId: defaultVariantId || '',
  };
}

export async function listAdminBlogPosts(
  env: Env,
  options?: {
    first?: number;
  },
) {
  const first = options?.first ?? 100;
  const envValues = env as unknown as Record<string, string | undefined>;
  const storeDomain = normalizeDomain(envValues.SHOPIFY_STORE_DOMAIN || env.PUBLIC_STORE_DOMAIN);

  const data = await shopifyAdminGraphql<{
    articles: {
      nodes: Array<{
        id: string;
        title: string;
        handle: string;
        updatedAt: string;
        publishedAt: string | null;
        author: {
          name: string;
        } | null;
        blog: {
          title: string;
          handle: string;
        } | null;
      }>;
    };
  }>(
    env,
    `
      query AdminBlogPosts($first: Int!) {
        articles(first: $first, sortKey: UPDATED_AT, reverse: true) {
          nodes {
            id
            title
            handle
            updatedAt
            publishedAt
            author {
              name
            }
            blog {
              title
              handle
            }
          }
        }
      }
    `,
    { first },
  );

  return data.articles.nodes.map((article) => {
    const numericId = extractShopifyNumericId(article.id);
    const adminEditUrl = storeDomain
      ? `https://${storeDomain}/admin/articles/${numericId}`
      : '#';
    const publicUrl =
      storeDomain && article.blog?.handle
        ? `https://${storeDomain}/blogs/${article.blog.handle}/${article.handle}`
        : '#';

    return {
      id: article.id,
      title: article.title,
      handle: article.handle,
      blogTitle: article.blog?.title || 'Blog',
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
      authorName: article.author?.name || 'Sin autor',
      adminEditUrl,
      publicUrl,
    } satisfies AdminBlogPostSummary;
  });
}

export async function toggleArticleVisibility(env: Env, articleId: string, publish: boolean) {
  const result = await shopifyAdminGraphql<{
    articleUpdate: {
      article: { id: string; publishedAt: string | null } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(
    env,
    `
      mutation ToggleArticleVisibility($id: ID!, $article: ArticleUpdateInput!) {
        articleUpdate(id: $id, article: $article) {
          article { id publishedAt }
          userErrors { message }
        }
      }
    `,
    {
      id: articleId,
      article: {
        isPublished: publish,
      },
    },
  );

  if (result.articleUpdate.userErrors.length > 0) {
    throw new Error(result.articleUpdate.userErrors[0]?.message || 'No se pudo cambiar la visibilidad del articulo');
  }

  return true;
}

export async function createDemoOrdersForCustomer(
  env: Env,
  customerId: string,
  count = 5,
) {
  const productData = await shopifyAdminGraphql<{
    products: {
      nodes: Array<{
        id: string;
        title: string;
        variants: {
          nodes: Array<{
            id: string;
          }>;
        };
      }>;
    };
  }>(
    env,
    `
      query DemoOrderProducts($first: Int!) {
        products(first: $first) {
          nodes {
            id
            title
            variants(first: 1) {
              nodes {
                id
              }
            }
          }
        }
      }
    `,
    { first: Math.max(8, count) },
  );

  const variantIds = productData.products.nodes
    .map((product) => product.variants.nodes[0]?.id)
    .filter(Boolean) as string[];

  if (variantIds.length === 0) {
    throw new Error('No se encontraron variantes de productos para crear pedidos demo');
  }

  const plans = Array.from({ length: count }).map((_, index) => ({
    variantId: variantIds[index % variantIds.length],
    quantity: (index % 3) + 1,
    paymentPending: index % 2 === 0,
    note: `Pedido demo Translate3D #${index + 1}`,
  }));

  const createdOrderIds: string[] = [];

  for (const plan of plans) {
    const draftCreate = await shopifyAdminGraphql<{
      draftOrderCreate: {
        draftOrder: { id: string } | null;
        userErrors: Array<{ message: string }>;
      };
    }>(
      env,
      `
        mutation DraftOrderCreate($input: DraftOrderInput!) {
          draftOrderCreate(input: $input) {
            draftOrder {
              id
            }
            userErrors {
              message
            }
          }
        }
      `,
      {
        input: {
          customerId,
          useCustomerDefaultAddress: true,
          note: plan.note,
          tags: ['demo-admin', 'pedido-demo'],
          lineItems: [
            {
              variantId: plan.variantId,
              quantity: plan.quantity,
            },
          ],
        },
      },
    );

    if (draftCreate.draftOrderCreate.userErrors.length > 0) {
      throw new Error(draftCreate.draftOrderCreate.userErrors[0]?.message || 'No se pudo crear pedido demo');
    }

    const draftId = draftCreate.draftOrderCreate.draftOrder?.id;
    if (!draftId) {
      throw new Error('No se recibio draftOrder id al crear pedido demo');
    }

    const completed = await shopifyAdminGraphql<{
      draftOrderComplete: {
        draftOrder: {
          id: string;
          order: { id: string } | null;
        } | null;
        userErrors: Array<{ message: string }>;
      };
    }>(
      env,
      `
        mutation DraftOrderComplete($id: ID!, $paymentPending: Boolean!) {
          draftOrderComplete(id: $id, paymentPending: $paymentPending) {
            draftOrder {
              id
              order {
                id
              }
            }
            userErrors {
              message
            }
          }
        }
      `,
      {
        id: draftId,
        paymentPending: plan.paymentPending,
      },
    );

    if (completed.draftOrderComplete.userErrors.length > 0) {
      throw new Error(completed.draftOrderComplete.userErrors[0]?.message || 'No se pudo completar pedido demo');
    }

    if (completed.draftOrderComplete.draftOrder?.order?.id) {
      createdOrderIds.push(completed.draftOrderComplete.draftOrder.order.id);
    }
  }

  return createdOrderIds;
}
