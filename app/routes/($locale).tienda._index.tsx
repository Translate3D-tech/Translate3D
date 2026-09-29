import { useLoaderData } from 'react-router';
import type { Route } from './+types/($locale).tienda._index';
import { StoreCategories, type StoreCategory } from '~/components/landing/StoreCategories';
import { BestSellers } from '~/components/landing/BestSellers';
import { SectionSeparator } from '~/components/SectionSeparator';

export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Translate3D | Tienda de Impresión 3D' },
    { name: 'description', content: 'Explora la colección Maestr@ Cool, modelos 3D y artículos personalizados de Translate3D.' },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const { storefront } = args.context;

  const { products, maestraCool } = await storefront.query(BEST_SELLERS_STORE_QUERY, {
    cache: storefront.CacheShort(),
  });

  return {
    bestSellers: products.nodes,
    showMaestraCool: Boolean(maestraCool?.products.nodes.length),
  };
}

export default function TiendaIndex() {
  const { bestSellers, showMaestraCool } = useLoaderData<typeof loader>();

  const storeCategories: StoreCategory[] = [
    ...(showMaestraCool ? [{
      title: 'Colección Maestr@ Cool',
      to: '/tienda/coleccion-maestr-cool',
      imageSrc: '/tienda/maestra-cool.jpeg',
      rounded: 'left' as const,
    }] : []),
    {
      title: 'Modelos 3D',
      to: '/tienda/modelos-3d',
      imageSrc: '/tienda/modelos-3d.webp',
      rounded: showMaestraCool ? 'none' : 'left',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen items-center justify-between gap-20 py-28">
      <StoreCategories categories={storeCategories} />
      <SectionSeparator />
      <BestSellers products={bestSellers as any} />
    </div>
  );
}

const BEST_SELLERS_STORE_QUERY = `#graphql
  query BestSellersStore($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    maestraCool: collection(handle: "coleccion-maestr-cool") {
      products(first: 1) {
        nodes { id }
      }
    }
    products(first: 8, sortKey: BEST_SELLING) {
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
        }
      }
    }
  }
` as const;
