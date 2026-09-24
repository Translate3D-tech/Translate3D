import { Suspense } from 'react';
import { Await, Link } from 'react-router';
import type { FooterQuery, HeaderQuery } from 'storefrontapi.generated';
import { Button } from '~/components/ui/button';
import { SectionSeparator } from '~/components/SectionSeparator';
import { Facebook, Instagram, Youtube } from 'lucide-react';
import { cn, focusStyle } from '~/lib/utils';
import {OrderTracker} from '~/components/OrderTracker';

import { useIsMobile } from '~/hooks/use-mobile';

interface FooterProps {
  footer: Promise<FooterQuery | null>;
  footerArticles: Promise<any[]>;
  header: HeaderQuery;
  publicStoreDomain: string;
}

type FooterMenuItem = NonNullable<FooterQuery['menu']>['items'][number];

export function Footer({
  footer: footerPromise,
  footerArticles,
  header,
  publicStoreDomain,
}: FooterProps) {
  return (
    <Suspense fallback={<div className="h-32 bg-dark" />}>
      <Await resolve={footerPromise}>
        {(footer) => (
          <footer className="flex flex-col min-h-fit w-full bg-dark text-light items-center justify-between">
            <SectionSeparator color="dark" />

            <FooterHero />

            <FooterTracker />

            <FooterLinks
              menu={footer?.menu ?? null}
              footerArticles={footerArticles}
              primaryDomainUrl={header.shop.primaryDomain.url}
              publicStoreDomain={publicStoreDomain}
            />
          </footer>
        )}
      </Await>
    </Suspense>
  );
}

function FooterHero() {
  const isMobile = useIsMobile();
  return (
    <div className={cn("flex w-full items-center gap-4 px-5 py-10 lg:px-20", isMobile ? "justify-center" : "justify-between")}>
      <p className="text-[64px] lg:text-[96px] text-center font-extrabold leading-[100%] tracking-tight uppercase">
        De tu cabeza
        <br />a tu mesa
      </p>
      {isMobile ? null : (
        <img
          src="/work.webp"
          alt="Translate3D"
          className="w-[450px] aspect-[2/1] h-auto object-cover"
          loading="lazy"
        />
      )}
    </div>
  );
}

function FooterTracker() {
  return (
    <div className="flex w-full items-center justify-between gap-4 px-4 pb-10">
      <OrderTracker variant="footer" />
    </div>
  );
}

function FooterLinks({
  menu,
  footerArticles,
  primaryDomainUrl,
  publicStoreDomain,
}: {
  menu: FooterQuery['menu'] | null;
  footerArticles: Promise<any[]>;
  primaryDomainUrl: FooterProps['header']['shop']['primaryDomain']['url'];
  publicStoreDomain: string;
}) {
  const items = (menu?.items?.length ? menu.items : FALLBACK_FOOTER_MENU.items) as FooterMenuItem[];

  const normalizeUrl = (rawUrl: string) =>
    rawUrl.includes('myshopify.com') ||
      rawUrl.includes(publicStoreDomain) ||
      rawUrl.includes(primaryDomainUrl)
      ? new URL(rawUrl).pathname
      : rawUrl;

  const columns = items.map((item) => ({
    title: item.title,
    url: item.url ? normalizeUrl(item.url) : null,
    children: (item.items ?? []).filter((c) => c.url) as FooterMenuItem[],
  }));

  return (
    <div className="flex flex-col w-full px-5 py-10 lg:px-20 lg:py-20">
      {/* Top Section - 4 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-light">
        {/* Column 1: Big Bold Links */}
        <div className="flex flex-col gap-2 p-5 border-b lg:border-b-0 lg:border-r border-light">
          {columns[0]?.children.map((child) => (
            <Link
              key={child.id}
              to={normalizeUrl(child.url!)}
              className={cn(
                "text-2xl font-extrabold uppercase tracking-tight hover:text-light/60 transition-colors leading-tight rounded",
                focusStyle({ theme: 'light' })
              )}
            >
              {child.title}
            </Link>
          ))}
        </div>

        {/* Column 2: Blog (Dynamic Articles) */}
        <div className="flex flex-col gap-6 p-5 border-b lg:border-b-0 lg:border-r border-light">
          <p className="text-xl font-extrabold uppercase tracking-tight">Blog</p>
          <div className="flex flex-col gap-2">
            <Suspense fallback={<p className="text-xs font-thin animate-pulse">Cargando...</p>}>
              <Await resolve={footerArticles}>
                {(articles) => (
                  articles.map((article: any) => (
                    <Link
                      key={article.id}
                      to={`/blog/${article.handle}`}
                      className={cn(
                        "w-fit link-light font-thin text-sm leading-tight hover:text-light/60 transition-colors rounded",
                        focusStyle({ theme: 'light' })
                      )}
                    >
                      {article.title}
                    </Link>
                  ))
                )}
              </Await>
            </Suspense>
          </div>
        </div>

        {/* Column 3: Nosotros
        <div className="flex flex-col gap-6 p-5 border-b lg:border-b-0 lg:border-r border-light">
          <p className="text-xl font-extrabold uppercase tracking-tight">Nosotros</p>
          <div className="flex flex-col gap-2">
            {columns[2]?.children.map((child) => (
              <Link
                key={child.id}
                to={normalizeUrl(child.url!)}
                className="w-fit link-light font-thin text-sm leading-tight"
              >
                {child.title}
              </Link>
            ))}
          </div>
        </div>
        */}

        {/* Column 4: Soporte
        <div className="flex flex-col gap-6 p-5 pb-10 lg:pb-5">
          <p className="text-xl font-extrabold uppercase tracking-tight">Soporte</p>
          <div className="flex flex-col gap-2">
            {columns[3]?.children.map((child) => (
              <Link
                key={child.id}
                to={normalizeUrl(child.url!)}
                className="w-fit link-light font-thin text-sm leading-tight"
              >
                {child.title}
              </Link>
            ))}
          </div>
        </div>
        */}
      </div>

      {/* Bottom Section - Aligned with Top Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4">
        {/* Socials - Column 1 */}
        <div className="flex flex-col justify-between p-5 gap-8 border-b lg:border-b-0 lg:border-r border-light min-h-[180px]">
          <p className="text-xl font-extrabold uppercase tracking-tight">Nuestras redes oficiales</p>
          <div className="flex gap-4">
            <Link to="/" className={cn("hover:text-light/60 transition-opacity rounded", focusStyle({ theme: 'light' }))}>
              <Facebook className="w-6 h-6" />
            </Link>
            <Link to="/" className={cn("hover:text-light/60 transition-opacity rounded", focusStyle({ theme: 'light' }))}>
              <Instagram className="w-6 h-6" />
            </Link>
            <Link to="/" className={cn("hover:text-light/60 transition-opacity rounded", focusStyle({ theme: 'light' }))}>
              <Youtube className="w-6 h-6" />
            </Link>
          </div>
        </div>

        {/* Brand - Column 2 */}
        <div className="flex items-center justify-center border-b border-light p-5 lg:min-h-[180px] lg:border-b-0 lg:border-r">
          <Link to="/" aria-label="Translate3D, ir al inicio" className={cn('rounded', focusStyle({ theme: 'light' }))}>
            <img src="/logos/translate3d.png" alt="Translate3D" className="h-36 w-auto object-contain" loading="lazy" />
          </Link>
        </div>

        {/* Store Link - Column 3 */}
        <div className="flex flex-col justify-between p-5 gap-8 border-b lg:border-b-0 lg:border-r border-light min-h-[180px]">
          <p className="text-xl font-extrabold uppercase tracking-tight">Descubre nuestros productos</p>
          <Button
            variant="darkSecondary"
            asChild
            className="w-fit border-light text-light hover:text-dark uppercase font-extrabold px-6"
          >
            <Link to="/tienda">Ver tienda</Link>
          </Button>
        </div>

        {/* Attribution - Column 4 */}
        <div className="flex items-end p-5 min-h-[180px]">
          <a
            href="https://nightlysoftware.com"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "text-xs font-thin link-light opacity-60 hover:opacity-100 transition-opacity rounded",
              focusStyle({ theme: 'light' })
            )}
          >
            Website by Nightly Software
          </a>
        </div>
      </div>
    </div>
  );
}

const FALLBACK_FOOTER_MENU = {
  id: 'fallback-footer-menu',
  items: [
    {
      id: 'footer-profesional',
      title: 'SECTOR PROFESIONAL',
      url: '/',
      items: [
        { id: 'f-1', title: 'SECTOR PROFESIONAL', url: '/' },
        { id: 'f-2', title: 'KITS DE ROB\u00D3TICA', url: '/' },
        { id: 'f-3', title: 'SERVICIOS', url: '/' },
      ],
    },
    {
      id: 'footer-blog',
      title: 'BLOG',
      url: '/blog',
      items: [
        { id: 'b-1', title: 'La impresi\u00f3n 3D en la medicina', url: '/blog' },
        { id: 'b-2', title: 'Cambios de filamento', url: '/blog' },
        { id: 'b-3', title: 'Reviews', url: '/blog' },
        { id: 'b-4', title: 'Resinas', url: '/blog' },
        { id: 'b-5', title: 'Mantenimiento', url: '/blog' },
        { id: 'b-6', title: 'Todos los articulos', url: '/blog' },
      ],
    },
    {
      id: 'footer-nosotros',
      title: 'NOSOTROS',
      url: '/blog',
      items: [
        { id: 'n-1', title: 'Nuestra historia', url: '/blog' },
        { id: 'n-2', title: 'Nuestro compromiso', url: '/blog' },
        { id: 'n-3', title: 'Equipo', url: '/blog' },
      ],
    },
    {
      id: 'footer-soporte',
      title: 'SOPORTE',
      url: '/soporte',
      items: [
        { id: 's-1', title: 'Opciones de contacto', url: '/soporte' },
        { id: 's-2', title: 'Proceso de env\u00edos', url: '/soporte' },
        { id: 's-3', title: 'Devoluciones', url: '/soporte' },
        { id: 's-4', title: 'Preguntas frecuentes', url: '/soporte' },
      ],
    },
  ],
};
