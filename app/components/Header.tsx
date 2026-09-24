import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { Await, NavLink, useAsyncValue, useLocation } from 'react-router';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type { HeaderQuery, CartApiQueryFragment } from 'storefrontapi.generated';
import { useAside } from '~/components/Aside';
import { cn, focusStyle } from '~/lib/utils';
import { LogoIcon } from '~/components/LogoIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { ChevronDown, Menu, Search, ShoppingCart, User } from 'lucide-react';
import {Input} from '~/components/ui/input';

interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

type Viewport = 'desktop' | 'mobile';

type MenuItem = NonNullable<HeaderQuery['menu']>['items'][number];

function getHeaderMenuItems(showMaestraCool: boolean): MenuItem[] {
  return (FALLBACK_HEADER_MENU.items as MenuItem[]).map((item) => ({
    ...item,
    items: (item.items ?? []).filter(
      (child) => showMaestraCool || child.id !== 'tienda-maestra-cool',
    ),
  }));
}

/* ───────────────────────── Nav Links (desktop) ───────────────────────── */

function NavLinks({
  isLight,
  isScrolled,
  items,
  primaryDomainUrl,
  publicStoreDomain,
}: {
  isLight: boolean;
  isScrolled: boolean;
  items: MenuItem[];
  primaryDomainUrl: string;
  publicStoreDomain: string;
}) {
  const { close } = useAside();

  const normalizeUrl = (rawUrl: string) =>
    rawUrl.includes('myshopify.com') ||
      rawUrl.includes(publicStoreDomain) ||
      rawUrl.includes(primaryDomainUrl)
      ? new URL(rawUrl).pathname
      : rawUrl;

  const linkClass = isLight || isScrolled ? 'link-dark' : 'link-light';

  return (
    <nav className="hidden items-center justify-center gap-4 font-bold uppercase md:flex">
      {items.map((item) => {
        if (!item.url) return null;
        const url = normalizeUrl(item.url);
        const childItems = item.items ?? [];

        if (childItems.length) {
          return <HoverDropdown key={item.id} item={item} linkClass={linkClass} normalizeUrl={normalizeUrl} close={close} />;
        }

        return (
          <NavLink
            key={item.id}
            to={url}
            end
            prefetch="intent"
            className={({ isActive }) =>
              cn(
                'rounded py-0.5 text-sm',
                isActive && 'text-primary',
                focusStyle({ theme: isLight || isScrolled ? 'dark' : 'light' })
              )
            }
          >
            <span className={cn('flex items-center gap-2 px-1 py-0.5', linkClass)}>
              {item.title}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function HoverDropdown({
  item,
  linkClass,
  normalizeUrl,
  close
}: {
  item: MenuItem;
  linkClass: string;
  normalizeUrl: (url: string) => string;
  close: () => void
}) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();

  const isChildActive = (item.items ?? []).some(sub => {
    if (!sub.url) return false;
    const subUrl = normalizeUrl(sub.url);
    return location.pathname === subUrl;
  });

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'h-fit !overflow-visible border-none p-0 font-bold transition-colors hover:bg-transparent',
              linkClass === 'link-light' ? 'text-brand-light' : 'text-brand-dark',
              isChildActive && 'text-primary'
            )}
          >
            <span className={cn('flex items-center gap-2 px-1 py-0.5 text-sm', linkClass)}>
              {item.title} <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-[170px]"
          align="start"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {(item.items ?? []).map((sub) => {
            if (!sub.url) return null;
            const subUrl = sub.url.includes('myshopify.com') ? new URL(sub.url).pathname : sub.url;
            return (
              <DropdownMenuItem
                key={sub.id}
                asChild
              >
                <NavLink
                  to={subUrl}
                  prefetch="intent"
                  onClick={() => {
                    close();
                    setOpen(false);
                  }}
                  className={({ isActive }) =>
                    cn(
                      isActive && '!text-primary',
                    )
                  }
                >
                  {sub.title}
                </NavLink>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}


/* ────────────────────────── Search bar (inline) ─────────────────────── */

function SearchBar({className}: {className?: string}) {
  const [query, setQuery] = useState('');

  return (
    <form
      action="/search"
      method="get"
      className={cn('flex items-center gap-1', className)}
    >
      <Input
        type="search"
        name="q"
        placeholder="Buscar"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="min-w-[200px]"
      />
      <Button
        type="submit"
        size="icon"
        variant="primary"
        aria-label="Buscar"
      >
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}

/* ──────────────────────── Cart + Account buttons ────────────────────── */

function CartBadge({ count }: { count: number | null }) {
  const { open } = useAside();
  const { publish, shop, cart, prevCart } = useAnalytics();

  return (
    <Button
      type="button"
      variant="primary"
      className='overflow-visible'
      size="icon"
      onClick={() => {
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        } as CartViewPayload);
      }}
      aria-label="Carrito"
    >
      <ShoppingCart className="h-4 w-4" />
      {count !== null && count > 0 ? (
        <span className="absolute -right-2 -top-2 inline-flex size-4 items-center justify-center rounded-md bg-primary text-[10px] font-extrabold text-light">
          {count}
        </span>
      ) : null}
    </Button>
  );
}

function CartToggle({ cart }: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={<CartBadge count={null} />}>
      <Await resolve={cart}>
        <CartBanner />
      </Await>
    </Suspense>
  );
}

function CartBanner() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} />;
}

import { Button } from '~/components/ui/button';

function AccountButton({ isLoggedIn }: { isLoggedIn: Promise<boolean> }) {
  return (
    <Suspense fallback={<Button variant="action" className="w-fit px-8">Cuenta</Button>}>
      <Await resolve={isLoggedIn} errorElement={<Button variant="action" className="w-fit px-8">Cuenta</Button>}>
        {(loggedIn) => (
          <Button
            asChild
            variant="action"
            icon={<User className="h-4 w-4" />}
          >
            <NavLink
              to="/account"
              prefetch="intent"
            >
              {loggedIn ? 'Mi cuenta' : 'Iniciar sesión'}
            </NavLink>
          </Button>
        )}
      </Await>
    </Suspense>
  );
}

/* ────────────────────────── Mobile toggle ────────────────────────── */

function HeaderMenuMobileToggle() {
  const { open } = useAside();

  return (
    <Button
      type="button"
      variant="primary"
      size="icon"
      onClick={() => open('mobile')}
      className="h-11 w-11 border-none md:hidden"
      aria-label="Menú"
    >
      <Menu className="h-4 w-4" />
    </Button>
  );
}

function HeaderSearchToggle() {
  const { open } = useAside();

  return (
    <Button
      type="button"
      variant="primary"
      size="icon"
      onClick={() => open('search')}
      className="h-11 w-11 border-none md:hidden"
      aria-label="Buscar"
    >
      <Search className="h-4 w-4" />
    </Button>
  );
}

/* ──────────────────────── Header CTA group ───────────────────────── */

function HeaderCtas({
  isLoggedIn,
  cart,
}: Pick<HeaderProps, 'isLoggedIn' | 'cart'>) {
  return (
    <div className="flex items-center gap-3">
      <div className="order-1 md:order-2">
        <CartToggle cart={cart} />
      </div>
      <div className="order-2 md:hidden">
        <HeaderMenuMobileToggle />
      </div>
      <div className="order-3 md:hidden">
        <HeaderSearchToggle />
      </div>
      <SearchBar className="order-1 hidden md:flex" />
      <span className="hidden md:inline-flex">
        <AccountButton isLoggedIn={isLoggedIn} />
      </span>
    </div>
  );
}

/* ═══════════════════════ MAIN HEADER ═══════════════════════════════ */

export function Header({
  header,
  isLoggedIn,
  cart,
  publicStoreDomain,
}: HeaderProps) {
  const { shop, menu } = header;
  const location = useLocation();
  const isHomePage = location.pathname === '/' || location.pathname === '';

  // On the homepage the navbar starts transparent; on other pages it's always "light" (white bg)
  const isLight = !isHomePage;

  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 50);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Force use of our custom menu to ensure 1:1 fidelity with the old design
  const items = getHeaderMenuItems(Boolean(header.maestraCool?.products.nodes.length));

  // Text colour depends on whether the bg is light
  const textColorClass = isLight || isScrolled ? 'text-dark' : 'text-light';

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-40 px-5 transition-all duration-200',
        textColorClass,
      )}
      style={{
        backgroundColor:
          isLight || isScrolled ? 'rgba(255, 255, 255, 0.8)' : 'transparent',
        backdropFilter: isLight || isScrolled ? 'blur(10px)' : 'none',
        padding: isScrolled ? '6px 20px' : '12px 20px',
      }}
    >
      <div className="flex w-full items-center justify-between">
        {/* Left: logo + nav links */}
        <div className="flex items-center gap-10">
          <NavLink
            to="/"
            end
            prefetch="intent"
            className={cn(
              "flex items-center gap-2 rounded-md",
              focusStyle({ theme: isLight || isScrolled ? 'dark' : 'light' })
            )}
          >
            <LogoIcon
              className={cn(
                'transition-transform duration-200',
                isScrolled ? 'h-9 w-9' : 'h-12 w-12',
              )}
            />
            <span
              className={cn(
                'whitespace-nowrap font-bold normal-case transition-transform duration-200',
                isScrolled ? 'text-xl' : 'text-2xl',
              )}
            >
              Translate3D
            </span>
          </NavLink>

          <NavLinks
            isLight={isLight}
            isScrolled={isScrolled}
            items={items}
            primaryDomainUrl={header.shop.primaryDomain.url}
            publicStoreDomain={publicStoreDomain}
          />
        </div>

        {/* Right: search, cart, account */}
        <HeaderCtas
          isLoggedIn={isLoggedIn}
          cart={cart}
        />
      </div>
    </header>
  );
}

/* ──────────────── Mobile menu (used by Aside) ───────────────── */

export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
  publicStoreDomain,
  showMaestraCool,
}: {
  menu: HeaderProps['header']['menu'];
  primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
  viewport: Viewport;
  publicStoreDomain: HeaderProps['publicStoreDomain'];
  showMaestraCool: boolean;
}) {
  const { close } = useAside();

  const items = getHeaderMenuItems(showMaestraCool);
  const normalizeUrl = (rawUrl: string) =>
    rawUrl.includes('myshopify.com') ||
      rawUrl.includes(publicStoreDomain) ||
      rawUrl.includes(primaryDomainUrl)
      ? new URL(rawUrl).pathname
      : rawUrl;

  if (viewport === 'mobile') {
    return (
      <div className="flex flex-col gap-4">
        <form action="/search" method="get" className="flex items-center gap-2">
          <Input
            type="search"
            name="q"
            placeholder="Buscar"
            className="h-11"
          />
          <Button
            type="submit"
            variant="primary"
            size="icon"
            aria-label="Buscar"
            className="h-11 w-11 border-none"
          >
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <nav className="flex flex-col gap-2" role="navigation">
          {items.map((item) => {
            if (!item.url) return null;
            const url = normalizeUrl(item.url);
            const childItems = item.items ?? [];

            return (
              <div key={item.id} className="flex flex-col gap-1">
                <NavLink
                  to={url}
                  onClick={close}
                  prefetch="intent"
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg border border-dark/10 bg-light px-4 py-3 text-base font-extrabold uppercase tracking-tight text-dark',
                      isActive && 'border-primary text-primary',
                      focusStyle({ theme: 'dark' })
                    )
                  }
                >
                  {item.title}
                </NavLink>

                {childItems.length ? (
                  <div className="ml-3 flex flex-col gap-1 border-l border-dark/10 pl-3">
                    {childItems.map((sub) => {
                      if (!sub.url) return null;
                      const subUrl = normalizeUrl(sub.url);
                      return (
                        <NavLink
                          key={sub.id}
                          to={subUrl}
                          onClick={close}
                          prefetch="intent"
                          className={({ isActive }) =>
                            cn(
                              'rounded-lg px-4 py-2 text-sm font-extrabold uppercase tracking-tight text-dark/80 hover:bg-dark hover:text-light',
                              isActive && 'text-primary',
                              focusStyle({ theme: 'dark' })
                            )
                          }
                        >
                          {sub.title}
                        </NavLink>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>
    );
  }

  // Desktop fallback (used from Aside context — shouldn't normally render)
  return null;
}

/* ──────────────── Fallback menu data ───────────────── */

const FALLBACK_HEADER_MENU = {
  id: 'fallback-menu',
  items: [
    {
      id: 'tienda',
      title: 'Tienda',
      type: 'HTTP',
      tags: [],
      url: '/tienda',
      items: [
        {
          id: 'tienda-maestra-cool',
          title: 'Colección Maestr@ Cool',
          type: 'HTTP',
          tags: [],
          url: '/tienda/coleccion-maestr-cool',
          items: [],
        },
        {
          id: 'tienda-modelos',
          title: 'Modelos 3D',
          type: 'HTTP',
          tags: [],
          url: '/tienda/modelos-3d',
          items: [],
        },
        {
          id: 'tienda-filamentos',
          title: 'Filamentos',
          type: 'HTTP',
          tags: [],
          url: '/tienda/filamentos',
          items: [],
        },
        {
          id: 'tienda-resinas',
          title: 'Resinas',
          type: 'HTTP',
          tags: [],
          url: '/tienda/resinas',
          items: [],
        },
        {
          id: 'tienda-refacciones',
          title: 'Refacciones',
          type: 'HTTP',
          tags: [],
          url: '/tienda/refacciones',
          items: [],
        },
      ],
    },
    {
      id: 'servicios',
      title: 'Servicios',
      type: 'HTTP',
      tags: [],
      url: '/servicios',
      items: [
        {
          id: 'servicios-modelado',
          title: 'Modelado 3D',
          type: 'HTTP',
          tags: [],
          url: '/servicios/modelado',
          items: [],
        },
        {
          id: 'servicios-impresion',
          title: 'Impresion',
          type: 'HTTP',
          tags: [],
          url: '/servicios/impresion',
          items: [],
        },
      ],
    },
    {
      id: 'blog',
      title: 'Blog',
      type: 'HTTP',
      tags: [],
      url: '/blog',
      items: [],
    },
  ],
};
