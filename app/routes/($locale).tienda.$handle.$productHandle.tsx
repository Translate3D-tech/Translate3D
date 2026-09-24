import { Link, redirect, useLoaderData, useParams } from 'react-router';
import { useState } from 'react';
import type { Route } from './+types/($locale).tienda.$handle.$productHandle';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import { ProductPrice } from '~/components/ProductPrice';
import { ProductImage } from '~/components/ProductImage';
import { ProductForm } from '~/components/ProductForm';
import { TagChip } from '~/components/landing/TagChip';
import { Breadcrumbs } from '~/components/ui/Breadcrumbs';
import { SectionSeparator } from '~/components/SectionSeparator';
import { BestSellers } from '~/components/landing/BestSellers';
import { ActionLinks } from '~/components/landing/ActionLinks';
import { SpecificationsTable } from '~/components/SpecificationsTable';
import { CallToAction } from '~/components/landing/CallToAction';
import { redirectIfHandleIsLocalized } from '~/lib/redirect';

export const meta: Route.MetaFunction = ({data, params}) => {
  const categoryHandle = params.handle || 'all';
  return [
    {title: `Translate3D | ${data?.product.title ?? ''}`},
    {
      rel: 'canonical',
      href: `/tienda/${categoryHandle}/${data?.product.handle}`,
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const { storefront } = args.context;

  // Start fetching non-critical data
  const deferredData = loadDeferredData(args);

  // Await critical data and also fetch best sellers for the related section
  const [criticalData, bestSellersResult] = await Promise.all([
    loadCriticalData(args),
    storefront.query(BEST_SELLERS_STORE_QUERY),
  ]);

  return {
    ...deferredData,
    ...criticalData,
    bestSellers: bestSellersResult.products.nodes,
  };
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({ context, params, request }: Route.LoaderArgs) {
  const { productHandle } = params;
  const { storefront } = context;

  if (!productHandle) {
    throw new Error('Se esperaba un handle de producto');
  }

  const [{ product }] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {
        handle: productHandle,
        selectedOptions: getSelectedProductOptions(request),
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
    throw new Response(null, { status: 404 });
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, { handle: productHandle, data: product });

  return {
    product,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({ context, params }: Route.LoaderArgs) {
  // Put any API calls that is not critical to be available on first page render
  // For example: product reviews, product recommendations, social feeds.

  return {};
}

export default function Product() {
  const { product } = useLoaderData<typeof loader>();
  const params = useParams();
  const category = params.handle || 'tienda';
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const { title, descriptionHtml, vendor, description, tags } = product;
  const images = product.images.nodes;
  const displayedImage = images.find((image) => image.url === selectedImageUrl)
    ?? selectedVariant?.image
    ?? product.featuredImage;

  // Replicating legacy breadcrumb logic
  const breadcrumbData = [
    { label: 'Tienda', href: '/tienda' },
    {
      label: category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' '),
      dropdown: [
        { label: 'Colección Maestr@ Cool', href: '/tienda/coleccion-maestr-cool' },
        { label: 'Modelos 3D', href: '/tienda/modelos-3d' },
        { label: 'Filamentos', href: '/tienda/filamentos' },
        { label: 'Resinas', href: '/tienda/resinas' },
        { label: 'Refacciones', href: '/tienda/refacciones' },
      ].filter((item) => !item.href.endsWith(category)),
    },
    { label: 'Galería', href: `/tienda/${category}` },
    { label: 'Éste producto', href: '', current: true },
  ];

  return (
    <section className="flex flex-col min-h-fit items-center justify-center gap-20 py-28 text-dark">
      <div className="flex flex-col w-full justify-center items-center gap-2.5">

        {/* Main Product Section: Two Column Layout */}
        <div className="flex flex-col lg:flex-row w-full max-w-7xl">

          {/* Left Column: Sticky Title, Breadcrumbs & Image */}
          <div className="flex flex-col h-fit w-full p-5 gap-8 overflow-hidden relative lg:sticky lg:top-24">
            <div className="flex flex-col items-start gap-5 px-5">
              <Breadcrumbs items={breadcrumbData} />

              <h1 className="select-none text-dark text-[40px] md:text-[64px] font-extrabold tracking-tighter uppercase leading-[1.1] md:leading-[1.1]">
                {title}
              </h1>

              <div className="relative w-full isolate">
                <ProductImage image={displayedImage} />
                {images.length > 1 && (
                  <div className="mt-3 flex gap-3 overflow-x-auto" aria-label="Imágenes del producto">
                    {images.map((image) => (
                      <button
                        key={image.url}
                        type="button"
                        onClick={() => setSelectedImageUrl(image.url)}
                        className={`h-20 w-20 shrink-0 overflow-hidden rounded-md border-2 ${displayedImage?.url === image.url ? 'border-primary' : 'border-dark/10'}`}
                        aria-label={`Ver imagen: ${image.altText || title}`}
                        aria-pressed={displayedImage?.url === image.url}
                      >
                        <img src={image.url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Details & Form */}
          <div className="flex flex-col w-full lg:max-w-[500px] lg:mx-20 py-10 lg:py-20 px-10 lg:px-0">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap gap-2">
                {tags?.map((tag: string) => (
                  <TagChip
                    key={tag}
                    label={tag}
                    availableForSale={selectedVariant?.availableForSale}
                  />
                ))}
              </div>

              <div>
                <h2 className="text-3xl font-extrabold mb-4 uppercase tracking-tighter">
                  Descripción del producto
                </h2>
                <div
                  className="normal-case text-tgray font-normal leading-relaxed whitespace-pre-line overflow-hidden line-clamp-[10]"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              </div>

              <div className="border-t border-dark/10 pt-6">
                <ProductForm
                  productOptions={productOptions}
                  selectedVariant={selectedVariant}
                  productHandle={product.handle}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Global Details Section */}
        <div className="flex flex-col w-full px-10 lg:px-20 max-w-7xl mt-12">
          {vendor && (
            <div className="w-full border-t border-dark py-12">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3">
                  <h2 className="text-xl font-extrabold uppercase tracking-tight text-dark">
                    Proveedor
                  </h2>
                </div>
                <div className="md:w-2/3">
                  <div className="space-y-3 normal-case text-lg font-medium">
                    {vendor}
                  </div>
                </div>
              </div>
            </div>
          )}

          {descriptionHtml && (
            <div className="w-full border-t border-dark py-12">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3">
                  <h2 className="text-xl font-extrabold uppercase tracking-tight text-dark">
                    Descripción
                  </h2>
                </div>
                <div className="md:w-2/3">
                  <div
                    className="prose prose-sm max-w-none text-dark/80 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mb-2"
                    dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                  />
                </div>
              </div>
            </div>
          )}

          {product.specifications?.value && (
            <SpecificationsTable details={product.specifications.value} />
          )}
        </div>

        {/* Footer Content */}
        <div className="w-full mt-10">
          <SectionSeparator />
          <BestSellers products={(useLoaderData<typeof loader>() as any).bestSellers || []} />
          <SectionSeparator />
          <ActionLinks />
          <SectionSeparator />
          <CallToAction />
        </div>
      </div>

      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </section>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    featuredImage {
      id
      url
      altText
      width
      height
    }
    images(first: 10) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
    descriptionHtml
    description
    tags
    specifications: metafield(namespace: "custom", key: "specifications") {
      value
    }
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;

const BEST_SELLERS_STORE_QUERY = `#graphql
  query BestSellersStoreProductPage($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: BEST_SELLING) {
      nodes {
        id
        availableForSale
        handle
        title
        tags
        collections(first: 10) {
          nodes {
            handle
            title
          }
        }
        featuredImage {
          id
          altText
          url
          width
          height
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
` as const;
