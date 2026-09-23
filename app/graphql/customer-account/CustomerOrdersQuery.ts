// NOTE: https://shopify.dev/docs/api/customer/latest/objects/Order
export const ORDER_ITEM_FRAGMENT = `#graphql
  fragment OrderListLineItem on LineItem {
    id
    title
    quantity
    variantTitle
    price {
      amount
      currencyCode
    }
    image {
      url
      altText
      width
      height
    }
  }

  fragment OrderItem on Order {
    totalPrice {
      amount
      currencyCode
    }
    financialStatus
    fulfillmentStatus
    cancelledAt
    id
    number
    confirmationNumber
    processedAt
    lineItems(first: 5) {
      nodes {
        ...OrderListLineItem
      }
    }
  }
` as const;

// NOTE: https://shopify.dev/docs/api/customer/latest/objects/Customer
export const CUSTOMER_ORDERS_FRAGMENT = `#graphql
  fragment CustomerOrders on Customer {
    orders(
      sortKey: PROCESSED_AT,
      reverse: true,
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor,
      query: $query
    ) {
      nodes {
        ...OrderItem
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        endCursor
        startCursor
      }
    }
  }
  ${ORDER_ITEM_FRAGMENT}
` as const;

// NOTE: https://shopify.dev/docs/api/customer/latest/queries/customer
export const CUSTOMER_ORDERS_QUERY = `#graphql
  ${CUSTOMER_ORDERS_FRAGMENT}
  query CustomerOrders(
    $endCursor: String
    $first: Int
    $last: Int
    $startCursor: String
    $query: String
    $language: LanguageCode
  ) @inContext(language: $language) {
    customer {
      ...CustomerOrders
    }
  }
` as const;
