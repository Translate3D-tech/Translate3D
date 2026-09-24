import { Await, useLoaderData } from 'react-router';
import type { Route } from './+types/($locale)._index';
import { Suspense } from 'react';
import type { BestSellerProduct } from '~/components/landing/BestSellers';
import type { StoreCategory } from '~/components/landing/StoreCategories';
import type { FeaturedArticle } from '~/components/landing/Featured';
import { Hero } from '~/components/landing/Hero';
import { Featured } from '~/components/landing/Featured';
import { RotatingCube } from '~/components/landing/RotatingCube';
import { StoreCategories } from '~/components/landing/StoreCategories';
import { BestSellers } from '~/components/landing/BestSellers';
import { ActionLinks } from '~/components/landing/ActionLinks';
import { CallToAction } from '~/components/landing/CallToAction';
import { SectionSeparator } from '~/components/SectionSeparator';

export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Translate3D | Impresión 3D, Filamentos, Resinas y Modelado' },
    { name: 'description', content: 'Translate3D: tu tienda especializada en impresión 3D en México. Filamentos, resinas, refacciones, modelos 3D y servicios profesionales de impresión y modelado. Tus ideas, en tus manos.' },
    { property: 'og:title', content: 'Translate3D | Impresión 3D, Filamentos, Resinas y Modelado' },
    { property: 'og:description', content: 'Tu tienda especializada en impresión 3D en México. Filamentos, resinas, refacciones y servicios profesionales.' },
    { property: 'og:type', content: 'website' },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  return { ...deferredData };
}

function loadDeferredData({ context }: Route.LoaderArgs) {
  const featuredArticles = context.storefront
    .query(HOME_FEATURED_ARTICLES_QUERY, {
      variables: {
        blogHandle: 'blog',
        first: 8,
      },
      cache: context.storefront.CacheLong(),
    })
    .then((res) => (res.blog?.articles?.nodes ?? []) as unknown as FeaturedArticle[])
    .catch((error: Error) => {
      console.error(error);
      return [] as FeaturedArticle[];
    });

  const categories = context.storefront
    .query(HOME_CATEGORIES_QUERY, { cache: context.storefront.CacheShort() })
    .then((res) => {
      const nodes = [
        res.modelos3d,
        res.filamentos,
        res.resinas,
        res.refacciones,
        res.maestraCool?.products.nodes.length ? res.maestraCool : null,
      ].filter(Boolean);

      const byHandle = new Map(nodes.map((c) => [c.handle, c]));

      const fallbackImages: Record<string, string> = {
        'modelos-3d': '/tienda/modelos-3d.webp',
        filamentos: '/tienda/filamentos.webp',
        resinas: '/tienda/resinas.webp',
        refacciones: '/tienda/refacciones.webp',
        'coleccion-maestr-cool': '/tienda/maestra-cool.jpeg',
      };

      const orderedHandles = ['coleccion-maestr-cool', 'modelos-3d', 'filamentos', 'resinas', 'refacciones'];
      const ordered = orderedHandles
        .map((handle) => {
          const c = byHandle.get(handle);
          if (!c) return null;
          return {
            title: c.title,
            to: `/tienda/${c.handle}`,
            imageSrc: c.image?.url ?? fallbackImages[c.handle] ?? '/work.webp',
            rounded:
              handle === 'coleccion-maestr-cool'
                ? 'left'
                : handle === 'refacciones'
                  ? 'right'
                  : 'none',
          } satisfies StoreCategory;
        })
        .filter(Boolean) as StoreCategory[];

      return ordered;
    })
    .catch((error: Error) => {
      console.error(error);
      return [] as StoreCategory[];
    });

  const bestSellers = context.storefront
    .query(HOME_BEST_SELLERS_QUERY, {
      variables: { first: 12 },
      cache: context.storefront.CacheShort(),
    })
    .then((res) => res.products.nodes as unknown as BestSellerProduct[])
    .catch((error: Error) => {
      console.error(error);
      return [] as BestSellerProduct[];
    });

  return { featuredArticles, categories, bestSellers };
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col">
      <Hero />

      <Suspense
        fallback={
          <section className="flex w-full items-center justify-center bg-light py-20 text-dark">
            <p className="text-sm font-semibold uppercase text-tgray">
              Cargando contenido…
            </p>
          </section>
        }
      >
        <Await resolve={data.featuredArticles}>
          {(articles) => <Featured articles={articles} />}
        </Await>
      </Suspense>

      <SectionSeparator />
      <RotatingCube />
      <SectionSeparator />

      <Suspense
        fallback={
          <section className="flex w-full items-center justify-center bg-light py-20 text-dark">
            <p className="text-sm font-semibold uppercase text-tgray">
              Cargando tienda…
            </p>
          </section>
        }
      >
        <Await resolve={data.categories}>
          {(categories) => <StoreCategories categories={categories} />}
        </Await>
      </Suspense>

      <Suspense
        fallback={
          <section className="flex w-full items-center justify-center bg-light py-20 text-dark">
            <p className="text-sm font-semibold uppercase text-tgray">
              Cargando productos…
            </p>
          </section>
        }
      >
        <Await resolve={data.bestSellers}>
          {(products) => <BestSellers products={products} />}
        </Await>
      </Suspense>

      <SectionSeparator />
      <ActionLinks />
      <SectionSeparator />
      <CallToAction />
    </div>
  );
}

const HOME_FEATURED_ARTICLES_QUERY = `#graphql
  query HomeFeaturedArticles(
    $blogHandle: String!
    $first: Int!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    blog(handle: $blogHandle) {
      handle
      title
      articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {
        nodes {
          id
          handle
          title
          publishedAt
          image {
            id
            altText
            url
            width
            height
          }
          blog {
            handle
          }
        }
      }
    }
  }
` as const;

const HOME_CATEGORIES_QUERY = `#graphql
  fragment CategoryCollection on Collection {
    id
    title
    handle
    image {
      id
      url
      altText
      width
      height
    }
  }

  query HomeCategories($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    modelos3d: collection(handle: "modelos-3d") {
      ...CategoryCollection
    }
    filamentos: collection(handle: "filamentos") {
      ...CategoryCollection
    }
    resinas: collection(handle: "resinas") {
      ...CategoryCollection
    }
    refacciones: collection(handle: "refacciones") {
      ...CategoryCollection
    }
    maestraCool: collection(handle: "coleccion-maestr-cool") {
      ...CategoryCollection
      products(first: 1) {
        nodes { id }
      }
    }
  }
` as const;

const HOME_BEST_SELLERS_QUERY = `#graphql
  fragment LandingProduct on Product {
    id
    title
    handle
    tags
    collections(first: 10) {
      nodes {
        handle
        title
      }
    }
    featuredImage {
      id
      url
      altText
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

  query HomeBestSellers(
    $first: Int!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        ...LandingProduct
      }
    }
  }
` as const;
