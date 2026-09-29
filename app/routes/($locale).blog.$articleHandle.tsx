import { Link, useLoaderData } from 'react-router';
import type { Route } from './+types/($locale).blog.$articleHandle';
import { Image } from '@shopify/hydrogen';
import { Button } from '~/components/ui/button';
import { Breadcrumbs } from '~/components/ui/Breadcrumbs';
import { SectionSeparator } from '~/components/SectionSeparator';
import { BlogPostListItem } from '~/components/blog/BlogPostListItem';
import { redirectIfHandleIsLocalized } from '~/lib/redirect';

export const meta: Route.MetaFunction = ({ data }) => {
  return [{ title: `Translate3D | ${data?.article.title ?? ''}` }];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);

  return { ...deferredData, ...criticalData };
}

async function loadCriticalData({ context, request, params }: Route.LoaderArgs) {
  const { articleHandle } = params;
  const blogHandle = 'blog';

  if (!articleHandle) {
    throw new Response('Not found', { status: 404 });
  }

  const [{ blog }] = await Promise.all([
    context.storefront.query(ARTICLE_QUERY, {
      variables: { blogHandle, articleHandle },
    }),
  ]);

  if (!blog?.articleByHandle) {
    throw new Response(null, { status: 404 });
  }

  redirectIfHandleIsLocalized(
    request,
    {
      handle: articleHandle,
      data: blog.articleByHandle,
    },
    {
      handle: blogHandle,
      data: blog,
    },
  );

  const article = blog.articleByHandle;
  const relatedArticles = (blog.articles?.nodes ?? [])
    .filter((candidate: any) => candidate.id !== article.id)
    .slice(0, 3);

  return { article, relatedArticles };
}

function loadDeferredData({ context }: Route.LoaderArgs) {
  return {};
}

export default function Article() {
  const { article, relatedArticles } = useLoaderData<typeof loader>();
  const { title, image, contentHtml, author } = article;

  const publishedDate = new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt));

  const displayAuthor =
    author?.name && !/shopify\s*api/i.test(author.name)
      ? author.name
      : 'Translate3D';

  const breadcrumbs = [
    { label: 'Blog', href: '/blog' },
    { label: 'Destacados', href: '/blog' },
    { label: 'Este articulo', current: true },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1920px] flex-col px-5 pb-20 pt-24 md:px-10 lg:pt-32">
      <section className="flex flex-col gap-10 border-b border-dark pb-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="lg:max-w-[360px]">
            <Breadcrumbs items={breadcrumbs} />
          </div>

          <div className="flex-1 lg:px-6">
            <h1 className="text-[clamp(2rem,4.5vw,3.4rem)] font-extrabold uppercase leading-[0.95] tracking-tight text-dark">
              {title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-dark/60">
              <time dateTime={article.publishedAt}>{publishedDate}</time>
              <span aria-hidden>&middot;</span>
              <address className="not-italic">{displayAuthor}</address>
            </div>
          </div>

          <div className="flex max-w-[380px] flex-wrap justify-start gap-2 lg:justify-end">
            {((article as any).tags ?? ['Blog']).slice(0, 4).map((tag: string) => (
              <span
                key={tag}
                className="rounded-full border border-dark/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-dark/70"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-dark/10 bg-lightgray">
          {image ? (
            <Image
              data={image}
              alt={image.altText || title}
              sizes="(min-width: 1200px) 1840px, 100vw"
              loading="eager"
              className="h-auto w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[16/7] w-full items-center justify-center text-sm font-bold uppercase text-dark/40">
              Sin imagen
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto mt-12 w-full max-w-[80ch]">
        <article
          className="prose prose-base max-w-none text-base leading-8 text-dark/90 prose-headings:font-extrabold prose-headings:uppercase prose-headings:tracking-tight prose-p:my-5 prose-li:my-2 prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </section>

      <section className="mt-16 border-y border-dark/40 py-12">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div className="overflow-hidden rounded-md border border-dark/10 bg-lightgray">
            <img
              src={image?.url || 'https://placehold.co/993x717'}
              alt={image?.altText || 'Galeria de productos'}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>

          <div className="flex flex-col items-start gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-dark/60">
              Galeria de productos
            </p>
            <h2 className="text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-dark">
              Artículos personalizados
            </h2>
            <p className="text-sm font-medium normal-case leading-relaxed text-dark/70">
              Descubre la colección Maestr@ Cool y encuentra un detalle hecho para ti.
            </p>
            <Button asChild variant="action">
              <Link to="/tienda/coleccion-maestr-cool" prefetch="intent">
                Ver productos
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-[clamp(2.25rem,5vw,3rem)] font-extrabold uppercase leading-[0.92] tracking-tight text-dark">
          Otros articulos
        </h2>

        <div className="mt-6">
          {relatedArticles.map((related: any) => (
            <BlogPostListItem key={related.id} article={related} loading="lazy" />
          ))}
        </div>
      </section>

      <SectionSeparator />
    </div>
  );
}

const ARTICLE_QUERY = `#graphql
  query Article(
    $articleHandle: String!
    $blogHandle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    blog(handle: $blogHandle) {
      handle
      articleByHandle(handle: $articleHandle) {
        id
        handle
        title
        contentHtml
        publishedAt
        tags
        author: authorV2 {
          name
        }
        image {
          id
          altText
          url
          width
          height
        }
        seo {
          description
          title
        }
      }
      articles(first: 8, sortKey: PUBLISHED_AT, reverse: true) {
        nodes {
          id
          handle
          title
          excerpt
          tags
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
