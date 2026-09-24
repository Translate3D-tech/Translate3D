import { redirect, useLoaderData, NavLink, Link, useSearchParams } from 'react-router';
import type { Route } from './+types/($locale).tienda.$handle._index';
import { getPaginationVariables, Analytics, flattenConnection } from '@shopify/hydrogen';
import { PaginatedResourceSection } from '~/components/PaginatedResourceSection';
import { redirectIfHandleIsLocalized } from '~/lib/redirect';
import { ProductItem } from '~/components/ProductItem';
import { Breadcrumbs } from '~/components/ui/Breadcrumbs';
import { Button } from '~/components/ui/button';
import { ChevronDown } from 'lucide-react';
import type { ProductItemFragment } from 'storefrontapi.generated';
import type { ProductCollectionSortKeys } from '@shopify/hydrogen/storefront-api-types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

export const meta: Route.MetaFunction = ({ data }) => {
  return [{ title: `Translate3D | ${data?.collection.title ?? ''}` }];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return { ...deferredData, ...criticalData };
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({ context, params, request }: Route.LoaderArgs) {
  const { handle } = params;
  const { storefront } = context;
  const searchParams = new URL(request.url).searchParams;
  const sort = searchParams.get('sort');
  const available = searchParams.get('available') === 'true';

  const paginationVariables = getPaginationVariables(request, {
    pageBy: 12,
  });

  if (!handle) {
    throw redirect('/tienda');
  }

  // Map sort param to Shopify keys
  let sortKey: ProductCollectionSortKeys = 'COLLECTION_DEFAULT';
  let reverse = false;

  switch (sort) {
    case 'populares':
      sortKey = 'BEST_SELLING';
      break;
    case 'recientes':
    case 'nuevos':
      sortKey = 'CREATED';
      reverse = true;
      break;
    case 'viejos':
      sortKey = 'CREATED';
      reverse = false;
      break;
    case 'precio-bajo':
      sortKey = 'PRICE';
      reverse = false;
      break;
    case 'precio-alto':
      sortKey = 'PRICE';
      reverse = true;
      break;
    case 'az':
      sortKey = 'TITLE';
      reverse = false;
      break;
    case 'za':
      sortKey = 'TITLE';
      reverse = true;
      break;
    default:
      sortKey = 'COLLECTION_DEFAULT';
      reverse = false;
  }

  // Filters
  const filters = [];
  if (available) {
    filters.push({ available: true });
  }

  const [{ collection }] = await Promise.all([
    storefront.query(COLLECTION_QUERY, {
      variables: {
        handle,
        ...paginationVariables,
        sortKey,
        reverse,
        filters
      },
    }),
  ]);

  if (!collection) {
    throw new Response(`Collection ${handle} not found`, {
      status: 404,
    });
  }

  redirectIfHandleIsLocalized(request, { handle, data: collection });

  const availabilityFilter = collection.products.filters?.find(
    (f: any) => f.id === 'filter.v.availability' || f.id === 'availability'
  );
  const totalCount = availabilityFilter
    ? availabilityFilter.values.reduce((acc: number, v: any) => acc + v.count, 0)
    : collection.products.nodes.length; // Fallback to current nodes if filters fail

  return {
    collection,
    totalCount,
    sort,
    available,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({ context }: Route.LoaderArgs) {
  return {};
}

export default function Collection() {
  const { collection, totalCount, sort, available } = useLoaderData<typeof loader>();
  const [params] = useSearchParams();

  const breadcrumbItems = [
    { label: 'Tienda', href: '/tienda' },
    {
      label: collection.title,
      dropdown: [
        { label: 'Colección Maestr@ Cool', href: '/tienda/coleccion-maestr-cool' },
        { label: 'Modelos 3D', href: '/tienda/modelos-3d' },
        { label: 'Filamentos', href: '/tienda/filamentos' },
        { label: 'Resinas', href: '/tienda/resinas' },
        { label: 'Refacciones', href: '/tienda/refacciones' },
      ].filter((item) => item.label.toLowerCase() !== collection.title.toLowerCase()),
    },
    { label: 'Galería', current: true },
  ];

  const description = collection.description || getCategoryDescription(collection.handle);

  // Helper for filter links
  const getFilterLink = (newSort: string | null, newAvailable: boolean | null) => {
    const curParams = new URLSearchParams(params);
    if (newSort !== undefined) {
      if (newSort) curParams.set('sort', newSort);
      else curParams.delete('sort');
    }
    if (newAvailable !== undefined) {
      if (newAvailable) curParams.set('available', 'true');
      else curParams.delete('available');
    }
    const search = curParams.toString();
    return search ? `?${search}` : '';
  };

  return (
    <div className="flex flex-col min-h-screen items-center gap-10 md:gap-20 py-20 md:py-28 text-dark">
      {/* Hero Section */}
      <div className="flex w-full justify-center items-center px-5">
        <div className="flex flex-col w-full max-w-7xl p-5 bg-dark/30 rounded-3xl gap-40 md:gap-56 overflow-hidden relative min-h-[400px] md:min-h-[500px]">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
            style={{ backgroundImage: `url(${collection.handle === 'coleccion-maestr-cool' ? '/tienda/maestra-cool.jpeg' : `/tienda/${collection.handle}.webp`})` }}
          />
          <div className="absolute inset-0 bg-black/40 z-10" />

          <div className="flex flex-col items-start gap-5 relative z-20">
            <Breadcrumbs items={breadcrumbItems} />
            <h1 className="select-none text-white text-[48px] md:text-[96px] font-extrabold tracking-tighter uppercase leading-[0.9] md:leading-[96px] max-w-4xl">
              {collection.title}
            </h1>
          </div>

          <div className="flex flex-col items-start gap-5 relative z-20">
            {description && (
              <p className="max-w-2xl text-white normal-case font-medium leading-tight drop-shadow-sm text-lg">
                {description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant={!sort && !available ? 'action' : 'primary'} size="sm">
                <Link to={getFilterLink(null, null)}>Todos</Link>
              </Button>
              <Button asChild variant={sort === 'populares' ? 'action' : 'primary'} size="sm">
                <Link to={getFilterLink('populares', null)}>Populares</Link>
              </Button>
              <Button asChild variant={sort === 'recientes' ? 'action' : 'primary'} size="sm">
                <Link to={getFilterLink('recientes', null)}>Recientes</Link>
              </Button>
              <Button asChild variant={available ? 'action' : 'primary'} size="sm" className="flex-shrink-0">
                <Link to={getFilterLink(null, !available)}>
                  {collection.handle === 'coleccion-maestr-cool' ? 'DISPONIBLES' : 'EN STOCK'}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Products Section */}
      <div className="w-full max-w-7xl px-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-8 px-5 lg:px-0">
          <div className="flex flex-col gap-1">
            <h2 className="text-[40px] md:text-[64px] font-extrabold tracking-tighter uppercase leading-none">
              {collection.title}
            </h2>
            <div className="flex items-center gap-1 text-sm font-bold uppercase tracking-tight">
              <span className="text-primary">{collection.products.nodes.length}</span>
              <span className="text-dark/60">Productos</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="primary" size="sm">
              Filtros:
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="default" className="h-10 px-4 flex items-center bg-light border border-dark rounded-md text-xs font-bold uppercase cursor-pointer transition-colors shadow-none">
                  Ordenar por: {
                    sort === 'populares' ? 'Populares' :
                      (sort === 'recientes' || sort === 'nuevos') ? 'Nuevos' :
                        sort === 'viejos' ? 'Viejos' :
                          sort === 'precio-bajo' ? 'Precio: Bajo a Alto' :
                            sort === 'precio-alto' ? 'Precio: Alto a Bajo' :
                              sort === 'az' ? 'A-Z' :
                                sort === 'za' ? 'Z-A' :
                                  'Predeterminado'
                  }
                  <ChevronDown className="ml-2 h-3 w-3 transition-transform group-hover/btn:rotate-180" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuItem asChild>
                  <Link to={getFilterLink(null, null)}>Predeterminado</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={getFilterLink('populares', null)}>Más Populares</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={getFilterLink('nuevos', null)}>Más Nuevos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={getFilterLink('viejos', null)}>Más Viejos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={getFilterLink('precio-bajo', null)}>Precio: Menor a Mayor</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={getFilterLink('precio-alto', null)}>Precio: Mayor a Menor</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={getFilterLink('az', null)}>Alfabético: A-Z</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={getFilterLink('za', null)}>Alfabético: Z-A</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="border-t border-dark">
          <PaginatedResourceSection<ProductItemFragment>
            connection={collection.products}
            total={totalCount}
            resourcesClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            resourceName={collection.title}
          >
            {({ node: product, index }) => (
              <div
                key={product.id}
                className="border-b border-r border-dark last:border-r-0 md:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r lg:[&:nth-child(3n)]:border-r-0 xl:[&:nth-child(3n)]:border-r xl:[&:nth-child(4n)]:border-r-0"
              >
                <ProductItem
                  product={product as any}
                  loading={index < 8 ? 'eager' : undefined}
                  collectionHandle={collection.handle}
                />
              </div>
            )}
          </PaginatedResourceSection>
        </div>
      </div>

      <Analytics.CollectionView
        data={{
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        }}
      />
    </div>
  );
}

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    availableForSale
    handle
    title
    tags
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
  }
` as const;

function getCategoryDescription(category: string) {
  const descriptions: { [key: string]: string } = {
    'coleccion-maestr-cool':
      'Artículos impresos en 3D para maestras, maestros y salones de clase. Elige el modelo y comparte tus detalles de personalización antes de agregarlo al carrito.',
    resinas:
      'Te ofrecemos una amplia variedad de resinas para tus impresoras 3D. Elige la que mejor se adapte a tus necesidades y preferencias. Contamos con una amplia gama de materiales, colores, estilos y tamaños para ir contigo sea cual sea el caso de uso que tengas.',
    filamentos:
      'Te ofrecemos una amplia variedad de filamentos para tus impresoras 3D. Elige el que mejor se adapte a tus necesidades y preferencias. Contamos con una amplia gama de materiales, colores, estilos y tamaños para ir contigo sea cual sea el caso de uso que tengas.',
    'modelos-3d':
      'Encuentra el modelo pre-hecho perfecto para ti. Personalízalo a tu gusto: ajusta su tamaño, color, materiales y textura. Juega con la escala para adaptarlo a tus necesidades. También puedes comprar el modelo en formato digital o descargar algunos gratis de nuestra biblioteca.',
    refacciones:
      'Encuentra todas las refacciones originales que necesitas para mantener tu impresora 3D en las mejores condiciones o también para ese upgrade que necesitas. Ofrecemos piezas de repuesto directas del fabricante y de alta calidad para las marcas más populares.',
  };
  return descriptions[category] || '';
}

// NOTE: https://shopify.dev/docs/api/storefront/2022-04/objects/collection
const COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $filters: [ProductFilter!]
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor,
        sortKey: $sortKey,
        reverse: $reverse,
        filters: $filters
      ) {
        nodes {
          ...ProductItem
        }
        filters {
          id
          label
          type
          values {
            id
            label
            count
            input
          }
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
` as const;
