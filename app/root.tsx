import { Analytics, getShopAnalytics, useNonce } from '@shopify/hydrogen';
import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
  useLocation,
} from 'react-router';
import type { Route } from './+types/root';
import favicon16 from '~/assets/favicon-16.png';
import favicon32 from '~/assets/favicon-32.png';
import appleTouchIcon from '~/assets/apple-touch-icon.png';
import { FOOTER_QUERY, HEADER_QUERY } from '~/lib/fragments';
import tailwindCss from './styles/tailwind.css?url';
import { PageLayout } from './components/PageLayout';

export type RootLoader = typeof loader;

/**
 * This is important to avoid re-fetching root queries on sub-navigations
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') return true;

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;

  // Defaulting to no revalidation for root loader data to improve performance.
  // When using this feature, you risk your UI getting out of sync with your server.
  // Use with caution. If you are uncomfortable with this optimization, update the
  // line below to `return defaultShouldRevalidate` instead.
  // For more details see: https://remix.run/docs/en/main/route/should-revalidate
  return false;
};

/**
 * The main and reset stylesheets are added in the Layout component
 * to prevent a bug in development HMR updates.
 *
 * This avoids the "failed to execute 'insertBefore' on 'Node'" error
 * that occurs after editing and navigating to another page.
 *
 * It's a temporary fix until the issue is resolved.
 * https://github.com/remix-run/remix/issues/9242
 */
export function links() {
  return [
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com',
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossOrigin: 'anonymous',
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Anton&family=Manrope:wght@200..800&display=swap',
    },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: favicon32 },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: favicon16 },
    { rel: 'apple-touch-icon', sizes: '180x180', href: appleTouchIcon },
  ];
}

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  const { storefront, env } = args.context;

  return {
    ...deferredData,
    ...criticalData,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: false,
      // localize the privacy banner
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
  };
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({ context }: Route.LoaderArgs) {
  const { storefront } = context;

  const [header] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheShort(),
      variables: {
        headerMenuHandle: 'main-menu', // Adjust to your header menu handle
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return { header };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({ context }: Route.LoaderArgs) {
  const { storefront, customerAccount, cart } = context;

  // defer the footer query (below the fold)
  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'footer', // Adjust to your footer menu handle
      },
    })
    .catch((error: Error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });
  // defer the blog articles query for footer
  const footerArticles = storefront
    .query(FOOTER_ARTICLES_QUERY, {
      variables: {
        blogHandle: 'blog',
        first: 4,
      },
      cache: storefront.CacheLong(),
    })
    .then((res) => res.blog?.articles?.nodes ?? [])
    .catch((error: Error) => {
      console.error(error);
      return [];
    });

  return {
    cart: cart.get(),
    isLoggedIn: customerAccount.isLoggedIn(),
    footer,
    footerArticles,
  };
}

export function Layout({ children }: { children?: React.ReactNode }) {
  const nonce = useNonce();

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href={tailwindCss}></link>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  const data = useRouteLoaderData<RootLoader>('root');
  const location = useLocation();

  if (!data) {
    return <Outlet />;
  }

  const isAdminRoute = /^\/admin(?:\/|$)/.test(location.pathname);

  if (isAdminRoute) {
    return (
      <Analytics.Provider
        cart={data.cart}
        shop={data.shop}
        consent={data.consent}
      >
        <Outlet />
      </Analytics.Provider>
    );
  }

  return (
    <Analytics.Provider
      cart={data.cart}
      shop={data.shop}
      consent={data.consent}
    >
      <PageLayout {...data}>
        <Outlet />
      </PageLayout>
    </Analytics.Provider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const location = useLocation();
  let errorMessage = 'Error desconocido';
  let errorStatus = 500;
  let debugStack = '';

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
    debugStack = error.stack || '';
  }

  const isNotFound = errorStatus === 404;
  const timestamp = new Date().toISOString();

  return (
    <main className="mx-auto flex min-h-[65vh] w-full max-w-4xl flex-col items-start justify-center gap-4 px-5 py-16 text-dark">
      <div className="w-full rounded-2xl border border-dark/15 bg-white p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Error {errorStatus}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-dark">
          {isNotFound ? 'No encontramos esta página' : 'Algo salió mal'}
        </h1>
        <p className="mt-2 text-sm text-dark/75">
          {isNotFound
            ? 'La URL que abriste no existe o fue movida. Revisa el enlace e intenta nuevamente.'
            : 'Ocurrió un problema inesperado. Puedes copiar la información de depuración y enviarla a soporte.'}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/"
            className="inline-flex items-center rounded border border-dark bg-dark px-4 py-2 text-xs font-extrabold uppercase tracking-tight text-light hover:border-primary hover:bg-primary"
          >
            Ir al inicio
          </a>
          <a
            href="/soporte"
            className="inline-flex items-center rounded border border-dark/20 bg-light px-4 py-2 text-xs font-extrabold uppercase tracking-tight text-dark hover:border-dark"
          >
            Contactar soporte
          </a>
        </div>

        {isNotFound ? null : (
          <div className="mt-5 rounded-lg border border-dark/10 bg-light p-4 text-xs text-dark/80">
            <p className="font-extrabold uppercase tracking-tight text-dark">Depuración</p>
            <p className="mt-2">Ruta: {location.pathname}</p>
            <p>Fecha: {timestamp}</p>
            <p>Código: {errorStatus}</p>
            <p className="mt-2 break-words">Mensaje: {String(errorMessage || 'Sin mensaje')}</p>
            {debugStack ? (
              <pre className="mt-2 max-h-64 overflow-auto rounded border border-dark/10 bg-white p-3 text-[11px]">
                {debugStack}
              </pre>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}

const FOOTER_ARTICLES_QUERY = `#graphql
  query FooterArticles(
    $blogHandle: String!
    $first: Int!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(language: $language, country: $country) {
    blog(handle: $blogHandle) {
      articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {
        nodes {
          id
          title
          handle
          publishedAt
          blog {
            handle
          }
        }
      }
    }
  }
` as const;
