import { Analytics, getPaginationVariables } from '@shopify/hydrogen';
import type { ProductSortKeys } from '@shopify/hydrogen/storefront-api-types';
import type { PredictiveSearchQuery } from 'storefrontapi.generated';
import { Link, useLoaderData, useSearchParams } from 'react-router';
import type { Route } from './+types/($locale).search';
import { Button } from '~/components/ui/button';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { PaginatedResourceSection } from '~/components/PaginatedResourceSection';
import { ProductItem } from '~/components/ProductItem';
import { TagChip } from '~/components/landing/TagChip';
import {
  getEmptyPredictiveSearchResult,
  type PredictiveSearchReturn,
} from '~/lib/search';

export const meta: Route.MetaFunction = () => [
  { title: 'Translate3D | Buscar en tienda' },
  { name: 'description', content: 'Encuentra artículos personalizados y modelos 3D en la tienda de Translate3D.' },
];

type SearchLoaderData =
  | PredictiveSearchReturn
  | {
    type: 'regular';
    term: string;
    sort: string;
    available: boolean;
    queryString: string;
    products: {
      nodes: Array<any>;
      pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string | null;
        endCursor: string | null;
      };
    };
    totalCount: number;
  };

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const isPredictive = url.searchParams.has('predictive');

  if (isPredictive) {
    return predictiveSearch({ request, context });
  }

  return regularSearchProducts({ request, context });
}

export default function SearchPage() {
  const data = useLoaderData<typeof loader>() as SearchLoaderData;
  if (data.type === 'predictive') return null;

  const [params] = useSearchParams();

  const getFilterLink = (newSort: string | null, newAvailable: boolean | null, newTerm?: string) => {
    const current = new URLSearchParams(params);
    if (typeof newTerm === 'string') {
      if (newTerm.trim().length) current.set('q', newTerm.trim());
      else current.delete('q');
    }
    if (newSort !== undefined) {
      if (newSort) current.set('sort', newSort);
      else current.delete('sort');
    }
    if (newAvailable !== undefined) {
      if (newAvailable) current.set('available', 'true');
      else current.delete('available');
    }
    const search = current.toString();
    return search ? `?${search}` : '';
  };

  return (
    <div className="flex flex-col min-h-screen items-center gap-10 py-20 text-dark md:gap-20 md:py-28">
      <div className="flex w-full justify-center items-center px-5">
        <div className="flex flex-col w-full max-w-7xl p-5 bg-dark/85 rounded-3xl gap-8 md:gap-12 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(219,51,0,0.3),transparent_58%)]" />

          <div className="relative z-10">
            <h1 className="text-white text-[52px] md:text-[92px] font-extrabold tracking-tighter uppercase leading-[0.9]">
              Buscar en tienda
            </h1>
            <p className="mt-3 max-w-3xl text-base font-medium text-white/80">
              Encuentra artículos de Maestr@ Cool y modelos 3D en nuestra tienda.
            </p>
          </div>

          <form className="relative z-10 flex flex-col gap-3 md:flex-row" method="get">
            <input
              type="search"
              name="q"
              defaultValue={data.term}
              placeholder="Ej. resina, torre eiffel, filamento PLA..."
              className="h-12 w-full rounded-lg border border-light/40 bg-white px-4 text-base font-semibold text-dark placeholder:text-tgray focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input type="hidden" name="sort" value={data.sort || ''} />
            {data.available ? <input type="hidden" name="available" value="true" /> : null}
            <Button type="submit" variant="action" className="h-12 md:min-w-[180px]">
              Buscar
            </Button>
          </form>

          <div className="relative z-10 flex flex-wrap items-center gap-2">
            <Button asChild variant={!data.sort && !data.available ? 'action' : 'secondary'} size="sm">
              <Link to={getFilterLink(null, null)}>Todos</Link>
            </Button>
            <Button asChild variant={data.sort === 'populares' ? 'action' : 'secondary'} size="sm">
              <Link to={getFilterLink('populares', null)}>Populares</Link>
            </Button>
            <Button asChild variant={data.sort === 'recientes' ? 'action' : 'secondary'} size="sm">
              <Link to={getFilterLink('recientes', null)}>Recientes</Link>
            </Button>
            <Button asChild variant={data.available ? 'action' : 'secondary'} size="sm">
              <Link to={getFilterLink(null, !data.available)}>En stock</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl px-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-8 px-5 lg:px-0">
          <div className="flex flex-col gap-1">
            <h2 className="text-[40px] md:text-[64px] font-extrabold tracking-tighter uppercase leading-none">
              {data.term ? `Resultados: ${data.term}` : 'Catálogo completo'}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-tight">
              <TagChip label={`${data.products.nodes.length} visibles`} />
              {data.queryString ? <TagChip label="Búsqueda aplicada" /> : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm">
              Ordenar:
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="default" className="h-10 px-4 flex items-center">
                  {resolveSortLabel(data.sort)}
                  <ChevronDown className="ml-2 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[220px]">
                <DropdownMenuItem asChild>
                  <Link to={getFilterLink(null, null)}>Predeterminado</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={getFilterLink('populares', null)}>Más populares</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={getFilterLink('recientes', null)}>Más recientes</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={getFilterLink('viejos', null)}>Más viejos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={getFilterLink('precio-bajo', null)}>Precio: menor a mayor</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={getFilterLink('precio-alto', null)}>Precio: mayor a menor</Link>
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
          {data.products.nodes.length === 0 ? (
            <div className="py-14 text-center">
              <h3 className="text-3xl font-extrabold uppercase">Sin resultados</h3>
              <p className="mt-2 text-sm text-dark/70">No encontramos productos para tu búsqueda actual.</p>
            </div>
          ) : (
            <PaginatedResourceSection<any>
              connection={data.products}
              total={data.totalCount}
              resourcesClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              resourceName="productos"
            >
              {({ node: product, index }) => (
                <div
                  key={product.id}
                  className="border-b border-r border-dark last:border-r-0 md:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r lg:[&:nth-child(3n)]:border-r-0 xl:[&:nth-child(3n)]:border-r xl:[&:nth-child(4n)]:border-r-0"
                >
                  <ProductItem
                    product={product}
                    loading={index < 8 ? 'eager' : undefined}
                    collectionHandle={resolveCollectionHandle(product)}
                  />
                </div>
              )}
            </PaginatedResourceSection>
          )}
        </div>
      </div>

      <Analytics.SearchView
        data={{
          searchTerm: data.term,
          searchResults: {
            total: data.products.nodes.length,
            items: {
              products: {
                nodes: data.products.nodes,
              },
            },
          },
        }}
      />
    </div>
  );
}

async function regularSearchProducts({ request, context }: Pick<Route.LoaderArgs, 'request' | 'context'>) {
  const { storefront } = context;
  const url = new URL(request.url);
  const params = url.searchParams;
  const term = String(params.get('q') || '').trim();
  const sort = String(params.get('sort') || '').trim();
  const available = params.get('available') === 'true';
  const paginationVariables = getPaginationVariables(request, { pageBy: 12 });

  const { sortKey, reverse } = resolveProductSort(sort, term);
  const queryParts: string[] = [];
  if (term.length > 0) queryParts.push(term);
  if (available) queryParts.push('available_for_sale:true');
  const queryString = queryParts.join(' AND ');

  const { products } = await storefront.query(SEARCH_PRODUCTS_QUERY, {
    variables: {
      ...paginationVariables,
      query: queryString || null,
      sortKey,
      reverse,
    },
  });

  return {
    type: 'regular' as const,
    term,
    sort,
    available,
    queryString,
    products,
    totalCount: products.nodes.length,
  };
}

function resolveProductSort(sort: string, term: string) {
  let sortKey: ProductSortKeys = term ? 'RELEVANCE' : 'BEST_SELLING';
  let reverse = false;

  switch (sort) {
    case 'populares':
      sortKey = 'BEST_SELLING';
      reverse = false;
      break;
    case 'recientes':
      sortKey = 'CREATED_AT';
      reverse = true;
      break;
    case 'viejos':
      sortKey = 'CREATED_AT';
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
      break;
  }

  return { sortKey, reverse };
}

function resolveCollectionHandle(product: {
  collections?: {
    nodes?: Array<{ handle?: string | null }>;
  };
}) {
  const handles =
    product.collections?.nodes?.map((collection) => collection.handle).filter(Boolean) || [];
  return handles.find((handle) => handle !== 'all' && handle !== 'frontpage') || undefined;
}

function resolveSortLabel(sort: string) {
  switch (sort) {
    case 'populares':
      return 'Más populares';
    case 'recientes':
      return 'Más recientes';
    case 'viejos':
      return 'Más viejos';
    case 'precio-bajo':
      return 'Precio: menor a mayor';
    case 'precio-alto':
      return 'Precio: mayor a menor';
    case 'az':
      return 'Alfabético: A-Z';
    case 'za':
      return 'Alfabético: Z-A';
    default:
      return 'Predeterminado';
  }
}

const SEARCH_PRODUCTS_QUERY = `#graphql
  query SearchProducts(
    $country: CountryCode
    $language: LanguageCode
    $query: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    products(
      first: $first
      last: $last
      before: $startCursor
      after: $endCursor
      query: $query
      sortKey: $sortKey
      reverse: $reverse
    ) {
      nodes {
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
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
        collections(first: 4) {
          nodes {
            handle
          }
        }
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
` as const;

const PREDICTIVE_SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment PredictiveArticle on Article {
    __typename
    id
    title
    handle
    blog {
      handle
    }
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_COLLECTION_FRAGMENT = `#graphql
  fragment PredictiveCollection on Collection {
    __typename
    id
    title
    handle
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_PAGE_FRAGMENT = `#graphql
  fragment PredictivePage on Page {
    __typename
    id
    title
    handle
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment PredictiveProduct on Product {
    __typename
    id
    title
    handle
    trackingParameters
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
    }
  }
` as const;

const PREDICTIVE_SEARCH_QUERY_FRAGMENT = `#graphql
  fragment PredictiveQuery on SearchQuerySuggestion {
    __typename
    text
    styledText
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_QUERY = `#graphql
  query PredictiveSearch(
    $country: CountryCode
    $language: LanguageCode
    $limit: Int!
    $limitScope: PredictiveSearchLimitScope!
    $term: String!
    $types: [PredictiveSearchType!]
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $limit
      limitScope: $limitScope
      query: $term
      types: $types
    ) {
      articles {
        ...PredictiveArticle
      }
      collections {
        ...PredictiveCollection
      }
      pages {
        ...PredictivePage
      }
      products {
        ...PredictiveProduct
      }
      queries {
        ...PredictiveQuery
      }
    }
  }
  ${PREDICTIVE_SEARCH_ARTICLE_FRAGMENT}
  ${PREDICTIVE_SEARCH_COLLECTION_FRAGMENT}
  ${PREDICTIVE_SEARCH_PAGE_FRAGMENT}
  ${PREDICTIVE_SEARCH_PRODUCT_FRAGMENT}
  ${PREDICTIVE_SEARCH_QUERY_FRAGMENT}
` as const;

async function predictiveSearch({
  request,
  context,
}: Pick<Route.ActionArgs, 'request' | 'context'>): Promise<PredictiveSearchReturn> {
  const { storefront } = context;
  const url = new URL(request.url);
  const term = String(url.searchParams.get('q') || '').trim();
  const limit = Number(url.searchParams.get('limit') || 10);
  const type = 'predictive';

  if (!term) return { type, term, result: getEmptyPredictiveSearchResult() };

  const {
    predictiveSearch: items,
    errors,
  }: PredictiveSearchQuery & { errors?: Array<{ message: string }> } = await storefront.query(PREDICTIVE_SEARCH_QUERY, {
    variables: {
      limit,
      limitScope: 'EACH',
      term,
    },
  });

  if (errors) {
    throw new Error(`Shopify API errors: ${errors.map(({ message }) => message).join(', ')}`);
  }

  if (!items) {
    throw new Error('No predictive search data returned from Shopify API');
  }

  const total = Object.values(items).reduce((acc: number, item: Array<unknown>) => acc + item.length, 0);
  return { type, term, result: { items, total } };
}
