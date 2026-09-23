import { Form, data, redirect, useActionData, useLoaderData, useNavigate } from 'react-router';
import type { Route } from './+types/admin';
import { AdminSidebar, resolveAdminSelection } from '~/components/admin/AdminSidebar';
import { Button } from '~/components/ui/button';
import { Menu, MoreHorizontal, Eye, EyeOff, ExternalLink, Archive, Trash2, ChevronDown, Search, Power } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { TagChip } from '~/components/landing/TagChip';
import { Image } from '@shopify/hydrogen';
import {
  archiveAdminProduct,
  createDemoOrdersForCustomer,
  deleteAdminProduct,
  toggleAdminProductStatus,
  isAdminCustomer,
  listAdminBlogPosts,
  listAdminCollectionProducts,
  listAdminOrders,
} from '~/lib/shopifyAdmin.server';
import { toggleArticleVisibility } from '~/lib/shopifyAdmin.server';
import { listServiceQuoteRequests } from '~/lib/serviceQuotes.server';
import { encodeRouteToken } from '~/lib/urlTokens';
import { createOrderTrackingReference } from '~/lib/orderTracking.server';
import { Input } from '~/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

type CatalogSort = 'updated_at_desc' | 'price_desc' | 'price_asc' | 'title_asc';
type OrderSort = 'date_desc' | 'date_asc' | 'total_desc' | 'total_asc' | 'customer_asc';
type QuoteSort = 'date_desc' | 'date_asc' | 'status_asc' | 'customer_asc' | 'service_asc';
type BlogSort = 'updated_desc' | 'updated_asc' | 'published_desc' | 'title_asc' | 'author_asc';

export const meta: Route.MetaFunction = () => [{ title: 'Translate3D Admin' }];

const TIENDA_VIEW_TO_COLLECTION: Record<string, string> = {
  'tienda-modelos-3d': 'modelos-3d',
  'tienda-filamentos': 'filamentos',
  'tienda-resinas': 'resinas',
  'tienda-refacciones': 'refacciones',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatMoney(amount: string, currencyCode: string) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currencyCode || 'MXN',
  }).format(Number(amount || '0'));
}

type AdminActionResponse = {
  ok: boolean;
  message: string;
};

function statusTone(status: string) {
  const value = status.toLowerCase();
  if (
    value.includes('paid') ||
    value.includes('fulfilled') ||
    value.includes('approved') ||
    value.includes('completed') ||
    value.includes('pagad') ||
    value.includes('completad') ||
    value.includes('aprobad')
  ) {
    return 'border-green-600/25 bg-green-50 text-green-700';
  }
  if (
    value.includes('cancel') ||
    value.includes('void') ||
    value.includes('refunded') ||
    value.includes('rejected') ||
    value.includes('rechazad') ||
    value.includes('cancelad')
  ) {
    return 'border-red-600/25 bg-red-50 text-red-700';
  }
  return 'border-primary/30 bg-primary/10 text-primary';
}

function formatFinancialStatus(status: string) {
  const key = status.toUpperCase();
  const labels: Record<string, string> = {
    PENDING: 'Pago pendiente',
    AUTHORIZED: 'Pago autorizado',
    PAID: 'Pagado',
    PARTIALLY_PAID: 'Pago parcial',
    PARTIALLY_REFUNDED: 'Reembolso parcial',
    REFUNDED: 'Reembolsado',
    VOIDED: 'Anulado',
  };
  return labels[key] || key.replace(/_/g, ' ').toLowerCase();
}

function formatFulfillmentStatus(status: string) {
  const key = status.toUpperCase();
  const labels: Record<string, string> = {
    UNFULFILLED: 'Sin preparar',
    PARTIALLY_FULFILLED: 'Preparacion parcial',
    FULFILLED: 'Completado',
    IN_PROGRESS: 'En proceso',
    ON_HOLD: 'En pausa',
    SCHEDULED: 'Programado',
  };
  return labels[key] || key.replace(/_/g, ' ').toLowerCase();
}

function formatQuoteStatus(status: string) {
  const key = status.toUpperCase();
  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    IN_REVIEW: 'En revision',
    APPROVED: 'Aprobada',
    REJECTED: 'Rechazada',
    CANCELED: 'Cancelada',
    COMPLETED: 'Completada',
  };
  return labels[key] || key.replace(/_/g, ' ').toLowerCase();
}

function catalogSortLabel(sort: CatalogSort) {
  switch (sort) {
    case 'updated_at_desc':
      return 'Ultima actualización';
    case 'price_desc':
      return 'Precio: alto → bajo';
    case 'price_asc':
      return 'Precio: bajo → alto';
    case 'title_asc':
      return 'Nombre: A → Z';
    default:
      return 'Ordenar por';
  }
}

function orderSortLabel(sort: OrderSort) {
  switch (sort) {
    case 'date_desc':
      return 'Mas recientes';
    case 'date_asc':
      return 'Mas antiguos';
    case 'total_desc':
      return 'Total: alto → bajo';
    case 'total_asc':
      return 'Total: bajo → alto';
    case 'customer_asc':
      return 'Cliente: A → Z';
    default:
      return 'Ordenar por';
  }
}

function quoteSortLabel(sort: QuoteSort) {
  switch (sort) {
    case 'date_desc':
      return 'Mas recientes';
    case 'date_asc':
      return 'Mas antiguos';
    case 'status_asc':
      return 'Estado: A → Z';
    case 'customer_asc':
      return 'Cliente: A → Z';
    case 'service_asc':
      return 'Servicio: A → Z';
    default:
      return 'Ordenar por';
  }
}

function blogSortLabel(sort: BlogSort) {
  switch (sort) {
    case 'updated_desc':
      return 'Mas recientes';
    case 'updated_asc':
      return 'Mas antiguos';
    case 'published_desc':
      return 'Publicación';
    case 'title_asc':
      return 'Titulo: A → Z';
    case 'author_asc':
      return 'Autor: A → Z';
    default:
      return 'Ordenar por';
  }
}

async function getAdminViewer(context: Route.LoaderArgs['context'] | Route.ActionArgs['context']) {
  const isLoggedIn = await context.customerAccount.isLoggedIn();
  if (!isLoggedIn) {
    return { ok: false as const, redirectTo: '/account/login' };
  }

  const { data: customerData, errors } = await context.customerAccount.query(ADMIN_CUSTOMER_QUERY, {
    variables: {
      language: context.customerAccount.i18n.language,
    },
  });

  if (errors?.length || !customerData?.customer?.id) {
    return { ok: false as const, redirectTo: '/account' };
  }

  const canAccessAdmin = await isAdminCustomer(context.env, customerData.customer.id);
  if (!canAccessAdmin) {
    return { ok: false as const, redirectTo: '/account' };
  }

  return {
    ok: true as const,
    customerId: customerData.customer.id,
    accountName:
      [customerData.customer.firstName, customerData.customer.lastName].filter(Boolean).join(' ').trim() ||
      customerData.customer.emailAddress?.emailAddress ||
      'Mi perfil',
  };
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const viewer = await getAdminViewer(context);
  if (!viewer.ok) {
    return redirect(viewer.redirectTo);
  }

  const url = new URL(request.url);
  const selection = resolveAdminSelection(url.searchParams.get('view'));
  const selectedCollectionHandle = TIENDA_VIEW_TO_COLLECTION[selection.view];

  const [orders, quotes, blogPosts, catalog] = await Promise.all([
    selection.view === 'pedidos-todos' ? listAdminOrders(context.env, { first: 200 }) : Promise.resolve([]),
    selection.view === 'servicios-solicitudes'
      ? listServiceQuoteRequests(context.env, { first: 200 })
      : Promise.resolve([]),
    selection.view === 'blog-articulos'
      ? listAdminBlogPosts(context.env, { first: 200 })
      : Promise.resolve([]),
    selectedCollectionHandle
      ? listAdminCollectionProducts(context.env, selectedCollectionHandle, { first: 200 })
      : Promise.resolve({ collection: null, products: [] }),
  ]);

  const ordersWithTrackingReferences = await Promise.all(
    orders.map(async (order) => ({
      ...order,
      trackingReference: await createOrderTrackingReference(context.env, order.id),
    })),
  );

  return data({
    selection,
    orders: ordersWithTrackingReferences,
    quotes,
    blogPosts,
    catalogCollection: catalog.collection,
    catalogProducts: catalog.products,
    selectedCollectionHandle: selectedCollectionHandle || null,
    viewerName: viewer.accountName,
  });
}

export async function action({ context, request }: Route.ActionArgs) {
  const viewer = await getAdminViewer(context);
  if (!viewer.ok) {
    return redirect(viewer.redirectTo);
  }

  const formData = await request.formData();
  const intent = String(formData.get('intent') || '');

  if (intent === 'archive_product') {
    const productId = String(formData.get('productId') || '');
    if (!productId) {
      return data<AdminActionResponse>({ ok: false, message: 'Producto invalido.' }, { status: 400 });
    }
    try {
      await archiveAdminProduct(context.env, productId);
      return data<AdminActionResponse>({ ok: true, message: 'Producto archivado correctamente.' });
    } catch (error) {
      return data<AdminActionResponse>(
        { ok: false, message: error instanceof Error ? error.message : 'No se pudo archivar el producto.' },
        { status: 500 },
      );
    }
  }

  if (intent === 'delete_product') {
    const productId = String(formData.get('productId') || '');
    if (!productId) {
      return data<AdminActionResponse>({ ok: false, message: 'Producto invalido.' }, { status: 400 });
    }
    try {
      await deleteAdminProduct(context.env, productId);
      return data<AdminActionResponse>({ ok: true, message: 'Producto eliminado correctamente.' });
    } catch (error) {
      return data<AdminActionResponse>(
        { ok: false, message: error instanceof Error ? error.message : 'No se pudo eliminar el producto.' },
        { status: 500 },
      );
    }
  }

  if (intent === 'toggle_product_status') {
    const productId = String(formData.get('productId') || '');
    const newStatus = String(formData.get('newStatus') || '') as 'ACTIVE' | 'DRAFT';
    if (!productId || !['ACTIVE', 'DRAFT'].includes(newStatus)) {
      return data<AdminActionResponse>({ ok: false, message: 'Datos invalidos.' }, { status: 400 });
    }
    try {
      await toggleAdminProductStatus(context.env, productId, newStatus);
      return data<AdminActionResponse>({
        ok: true,
        message: newStatus === 'ACTIVE' ? 'Producto publicado.' : 'Producto desactivado.',
      });
    } catch (error) {
      return data<AdminActionResponse>(
        { ok: false, message: error instanceof Error ? error.message : 'No se pudo cambiar el estado.' },
        { status: 500 },
      );
    }
  }

  if (intent === 'toggle_article_visibility') {
    const articleId = String(formData.get('articleId') || '');
    const publish = formData.get('publish') === 'true';
    if (!articleId) {
      return data<AdminActionResponse>({ ok: false, message: 'Articulo invalido.' }, { status: 400 });
    }
    try {
      await toggleArticleVisibility(context.env, articleId, publish);
      return data<AdminActionResponse>({
        ok: true,
        message: publish ? 'Articulo publicado.' : 'Articulo ocultado.',
      });
    } catch (error) {
      return data<AdminActionResponse>(
        { ok: false, message: error instanceof Error ? error.message : 'No se pudo cambiar la visibilidad.' },
        { status: 500 },
      );
    }
  }

  if (intent !== 'seed_demo_orders' && intent !== 'seed_one_demo_order') {
    return data<AdminActionResponse>(
      {
        ok: false,
        message: 'Accion no valida.',
      },
      { status: 400 },
    );
  }

  try {
    const count = intent === 'seed_one_demo_order' ? 1 : 5;
    const created = await createDemoOrdersForCustomer(context.env, viewer.customerId, count);
    return data<AdminActionResponse>({
      ok: true,
      message: `Se crearon ${created.length} pedido(s) demo reales para tu cuenta.`,
    });
  } catch (error) {
    return data<AdminActionResponse>(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'No se pudieron crear pedidos demo.',
      },
      { status: 500 },
    );
  }
}

export default function AdminRoute() {
  const {
    selection,
    quotes,
    orders,
    blogPosts,
    catalogCollection,
    catalogProducts,
    selectedCollectionHandle,
    viewerName,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  useEffect(() => {
    setSidebarMobileOpen(false);
  }, [selection.view]);

  const [catalogQ, setCatalogQ] = useState('');
  const [catalogSort, setCatalogSort] = useState<CatalogSort>('updated_at_desc');

  const [ordersQ, setOrdersQ] = useState('');
  const [ordersSort, setOrdersSort] = useState<OrderSort>('date_desc');

  const [quotesQ, setQuotesQ] = useState('');
  const [quotesSort, setQuotesSort] = useState<QuoteSort>('date_desc');

  const [blogQ, setBlogQ] = useState('');
  const [blogSort, setBlogSort] = useState<BlogSort>('updated_desc');

  const filteredProducts = useMemo(() => {
    if (!catalogProducts) return [];
    const search = catalogQ.trim().toLowerCase();
    const hasSearch = search.length > 0;

    const filtered = catalogProducts.filter((product) => {
      if (!hasSearch) return true;
      const title = (product.title || '').toLowerCase();
      const vendor = (product.vendor || '').toLowerCase();
      const sku = (product.variant?.sku || '').toLowerCase();
      return title.includes(search) || vendor.includes(search) || sku.includes(search);
    });

    return [...filtered].sort((a, b) => {
      switch (catalogSort) {
        case 'price_desc':
          return Number(b.variant?.price || 0) - Number(a.variant?.price || 0);
        case 'price_asc':
          return Number(a.variant?.price || 0) - Number(b.variant?.price || 0);
        case 'title_asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'updated_at_desc':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
  }, [catalogProducts, catalogQ, catalogSort]);

  const quoteStatusSummary = useMemo(() => {
    return quotes.reduce<Record<string, number>>((acc, quote) => {
      const key = formatQuoteStatus(quote.status);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    if (!quotes) return [];
    const search = quotesQ.trim().toLowerCase();
    const hasSearch = search.length > 0;

    const filtered = quotes.filter((quote) => {
      if (!hasSearch) return true;
      const orderId = (quote.orderId || '').toLowerCase();
      const customerName = (quote.customerName || '').toLowerCase();
      const customerEmail = (quote.customerEmail || '').toLowerCase();
      const serviceMode = (quote.serviceMode || '').toLowerCase();
      const summary = (quote.summary || '').toLowerCase();
      return (
        orderId.includes(search) ||
        customerName.includes(search) ||
        customerEmail.includes(search) ||
        serviceMode.includes(search) ||
        summary.includes(search)
      );
    });

    return [...filtered].sort((a, b) => {
      switch (quotesSort) {
        case 'date_asc':
          return new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime();
        case 'status_asc':
          return (a.status || '').localeCompare(b.status || '');
        case 'customer_asc':
          return (a.customerName || '').localeCompare(b.customerName || '');
        case 'service_asc':
          return (a.serviceMode || '').localeCompare(b.serviceMode || '');
        case 'date_desc':
        default:
          return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
      }
    });
  }, [quotes, quotesQ, quotesSort]);

  const filteredBlogPosts = useMemo(() => {
    if (!blogPosts) return [];
    const search = blogQ.trim().toLowerCase();
    const hasSearch = search.length > 0;

    const filtered = blogPosts.filter((post) => {
      if (!hasSearch) return true;
      const title = (post.title || '').toLowerCase();
      const handle = (post.handle || '').toLowerCase();
      const authorName = (post.authorName || '').toLowerCase();
      const blogTitle = (post.blogTitle || '').toLowerCase();
      return (
        title.includes(search) ||
        handle.includes(search) ||
        authorName.includes(search) ||
        blogTitle.includes(search)
      );
    });

    return [...filtered].sort((a, b) => {
      switch (blogSort) {
        case 'updated_asc':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'published_desc':
          return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
        case 'title_asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'author_asc':
          return (a.authorName || '').localeCompare(b.authorName || '');
        case 'updated_desc':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
  }, [blogPosts, blogQ, blogSort]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    const search = ordersQ.trim().toLowerCase();
    const hasSearch = search.length > 0;

    const filtered = orders.filter((order) => {
      if (!hasSearch) return true;
      const name = (order.name || '').toLowerCase();
      const customerName = (order.customerName || '').toLowerCase();
      const customerEmail = (order.customerEmail || '').toLowerCase();
      const confirmationNumber = (order.confirmationNumber || '').toLowerCase();
      const products = order.lineItems.map((item) => (item.title || '').toLowerCase()).join(' ');
      return (
        name.includes(search) ||
        customerName.includes(search) ||
        customerEmail.includes(search) ||
        confirmationNumber.includes(search) ||
        products.includes(search)
      );
    });

    return [...filtered].sort((a, b) => {
      switch (ordersSort) {
        case 'date_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'total_desc':
          return Number(b.totalAmount || 0) - Number(a.totalAmount || 0);
        case 'total_asc':
          return Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
        case 'customer_asc':
          return (a.customerName || '').localeCompare(b.customerName || '');
        case 'date_desc':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [orders, ordersQ, ordersSort]);

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-white text-dark">
      <AdminSidebar
        activeView={selection.view}
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        mobileOpen={isSidebarMobileOpen}
        onMobileClose={() => setSidebarMobileOpen(false)}
        viewerLabel={viewerName || 'Mi perfil'}
      />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-[#f6f6f6]">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-dark/10 bg-[#f6f6f6]/95 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            aria-label="Abrir menu admin"
            onClick={() => setSidebarMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-dark/20 bg-light text-dark"
          >
            <Menu className="h-4 w-4" />
          </button>
          <p className="text-sm font-extrabold uppercase tracking-tight text-dark">Panel admin</p>
          <div className="w-9" />
        </div>

        <div className="min-w-0 px-6 py-6 lg:px-10">
          <header className="flex flex-col gap-3 border-b border-dark/10 pb-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">Panel administrativo</p>
            <h1 className="font-manrope text-4xl font-extrabold uppercase leading-tight tracking-tight text-dark lg:text-5xl">
              {selection.sectionTitle}
            </h1>
          </header>

          {selection.view === 'pedidos-todos' ? (
            <section className="mt-8 rounded border border-dark/10 bg-light p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-manrope text-2xl font-extrabold uppercase tracking-tight text-dark">
                    Todos los pedidos
                  </h2>
                  <TagChip label={`Total: ${orders.length}`} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Form method="post">
                    <Button type="submit" name="intent" value="seed_one_demo_order" variant="secondary">
                      Crear 1 pedido demo
                    </Button>
                  </Form>
                  <Form method="post">
                    <Button type="submit" name="intent" value="seed_demo_orders" variant="action">
                      Crear 5 pedidos demo reales
                    </Button>
                  </Form>
                </div>
              </div>

              {actionData?.message ? (
                <div
                  className={[
                    'mt-4 rounded border px-4 py-3 text-sm font-semibold',
                    actionData.ok ? 'border-green-600/40 bg-green-50 text-green-800' : 'border-primary/40 bg-primary/10 text-dark',
                  ].join(' ')}
                >
                  {actionData.message}
                </div>
              ) : null}

              {orders.length === 0 ? (
                <p className="mt-4 text-sm text-dark/80">No hay pedidos en la tienda todavia.</p>
              ) : (
                <>
                  <div className="mt-6 rounded-xl border border-dark/10 bg-white p-4">
                    <div className="grid gap-3 lg:grid-cols-12">
                      <div className="relative lg:col-span-6">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tgray" />
                        <Input
                          type="search"
                          value={ordersQ}
                          onChange={(e) => setOrdersQ(e.target.value)}
                          placeholder="Buscar por pedido, cliente o producto..."
                          className="pl-10"
                        />
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            className="h-10 px-4 flex items-center bg-light border border-dark rounded-md text-xs font-bold uppercase lg:col-span-3"
                          >
                            {orderSortLabel(ordersSort)}
                            <ChevronDown className="ml-2 h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px]">
                          <DropdownMenuItem onSelect={() => setOrdersSort('date_desc')}>
                            Mas recientes
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setOrdersSort('date_asc')}>
                            Mas antiguos
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setOrdersSort('total_desc')}>
                            Total: alto → bajo
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setOrdersSort('total_asc')}>
                            Total: bajo → alto
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setOrdersSort('customer_asc')}>
                            Cliente: A → Z
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={ordersQ === '' && ordersSort === 'date_desc'}
                        onClick={() => {
                          setOrdersQ('');
                          setOrdersSort('date_desc');
                        }}
                        className="h-10 border border-dark bg-white text-xs font-bold uppercase lg:col-span-3 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Limpiar
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 max-w-full overflow-x-auto rounded border border-dark/10">
                    <table className="w-full min-w-[1720px] text-left">
                      <thead className="bg-dark text-xs font-extrabold uppercase tracking-tight text-light min-w-fit">
                        <tr>
                          <th className="px-4 py-3">Pedido</th>
                          <th className="w-[400px] px-4 py-3">Producto</th>
                          <th className="w-[250px] px-4 py-3">Cliente</th>
                          <th className="w-[400px] px-4 py-3">Productos</th>
                          <th className="w-[120px] px-4 py-3">Estado de pago</th>
                          <th className="w-[140px] px-4 py-3">Estado de envio</th>
                          <th className="px-4 py-3">Total</th>
                          <th className="w-[140px] px-4 py-3">Fecha</th>
                          <th className="w-[140px] px-4 py-3">Tags</th>
                          <th className="w-[100px] px-4 py-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => {
                          const orderHref = `/admin/pedidos/${encodeRouteToken(order.id)}`;
                          return (
                            <tr
                              key={order.id}
                              className="cursor-pointer border-t border-dark/10 bg-white align-top hover:bg-primary/5"
                              role="button"
                              tabIndex={0}
                              onClick={() => navigate(orderHref)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  navigate(orderHref);
                                }
                              }}
                            >
                              <td className="px-4 py-3">
                                <p className="text-xs font-bold uppercase text-dark">{order.name}</p>
                                <p className="text-xs text-dark/50">{order.trackingReference}</p>
                                {order.confirmationNumber ? (
                                  <p className="text-xs text-dark/50 uppercase">#{order.confirmationNumber}</p>
                                ) : null}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-12 w-12 min-w-12 min-h-12 shrink-0 overflow-hidden rounded-lg border border-dark/10 bg-light">
                                    {order.lineItems[0]?.imageUrl ? (
                                      <Image
                                        src={order.lineItems[0].imageUrl}
                                        alt={order.lineItems[0].imageAlt}
                                        width={48}
                                        height={48}
                                        className="h-12 w-12 object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-[9px] font-bold uppercase text-tgray">
                                        N/A
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-dark">
                                      {order.lineItems[0]?.title || 'Sin producto'}
                                    </p>
                                    <p className="text-[11px] text-dark/70">
                                      {order.lineItems.reduce((acc, item) => acc + Number(item.quantity || 0), 0)} artículos
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-xs font-semibold text-dark">{order.customerName}</p>
                                <p className="text-xs text-dark/70">{order.customerEmail || '-'}</p>
                              </td>
                              <td className="px-4 py-3 text-xs text-dark/80">
                                {order.lineItems.map((item) => `${item.quantity}x ${item.title}`).join(', ')}
                              </td>
                              <td className="w-[240px] px-4 py-3">
                                <TagChip
                                  label={formatFinancialStatus(order.displayFinancialStatus)}
                                  className={`w-fit text-[10px] ${statusTone(order.displayFinancialStatus)}`}
                                />
                              </td>
                              <td className="w-[150px] px-4 py-3">
                                <TagChip
                                  label={order.cancelledAt ? 'Pedido cancelado' : formatFulfillmentStatus(order.displayFulfillmentStatus)}
                                  className={`w-fit text-[10px] ${statusTone(order.cancelledAt ? 'CANCELLED' : order.displayFulfillmentStatus)}`}
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-dark">
                                {formatMoney(order.totalAmount, order.currencyCode)}
                              </td>
                              <td className="w-[220px] px-4 py-3 text-xs text-dark/75">{formatDate(order.createdAt)}</td>
                              <td className="px-4 py-3">
                                {order.tags.length > 0 ? (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {order.tags.slice(0, 3).map((tag) => (
                                      <div
                                        className="rounded-[4px] border border-dark/20 bg-primary px-0.5 text-[10px] font-bold uppercase text-light"
                                        key={`${order.id}-${tag}`}
                                      >
                                        {tag}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </td>
                              <td className="w-[100px] px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                                      aria-label="Acciones del pedido"
                                    >
                                      <MoreHorizontal className="h-4 w-4 text-dark/60" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-[220px] bg-white rounded-xl shadow-xl border border-gray-200 p-1">
                                    <DropdownMenuItem asChild className="flex flex-nowrap items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm font-medium text-dark">
                                      <a href={orderHref} className="flex flex-row flex-nowrap items-center gap-2.5">
                                        <Eye className="h-4 w-4 shrink-0 text-dark/40" />
                                        <span className="whitespace-nowrap">Ver en nuestro panel</span>
                                      </a>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="flex flex-nowrap items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm font-medium text-dark">
                                      <a
                                        href={`https://admin.shopify.com/store/translate3d/orders/${order.id.match(/(\d+)$/)?.[1] || ''}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex flex-row flex-nowrap items-center gap-2.5"
                                      >
                                        <ExternalLink className="h-4 w-4 shrink-0 text-dark/40" />
                                        <span className="whitespace-nowrap">Ver en Shopify</span>
                                      </a>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          ) : null}

          {selection.view === 'servicios-solicitudes' ? (
            <section className="mt-8 rounded border border-dark/10 bg-light p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-manrope text-2xl font-extrabold uppercase tracking-tight text-dark">
                    Solicitudes de cotización
                  </h2>
                  <TagChip label={`Total: ${quotes.length}`} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {quotes.length > 0
                    ? Object.entries(quoteStatusSummary).map(([status, count]) => (
                      <span
                        key={status}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusTone(status)}`}
                      >
                        {status}: {count}
                      </span>
                    ))
                    : null}
                </div>
              </div>

              {quotes.length === 0 ? (
                <p className="mt-4 text-sm text-dark/80">No hay solicitudes registradas.</p>
              ) : (
                <>
                  <div className="mt-6 rounded-xl border border-dark/10 bg-white p-4">
                    <div className="grid gap-3 lg:grid-cols-12">
                      <div className="relative lg:col-span-6">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tgray" />
                        <Input
                          type="search"
                          value={quotesQ}
                          onChange={(e) => setQuotesQ(e.target.value)}
                          placeholder="Buscar por folio, cliente, servicio..."
                          className="pl-10"
                        />
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            className="h-10 px-4 flex items-center bg-light border border-dark rounded-md text-xs font-bold uppercase lg:col-span-3"
                          >
                            {quoteSortLabel(quotesSort)}
                            <ChevronDown className="ml-2 h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px]">
                          <DropdownMenuItem onSelect={() => setQuotesSort('date_desc')}>
                            Mas recientes
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setQuotesSort('date_asc')}>
                            Mas antiguos
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setQuotesSort('status_asc')}>
                            Estado: A → Z
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setQuotesSort('customer_asc')}>
                            Cliente: A → Z
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setQuotesSort('service_asc')}>
                            Servicio: A → Z
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={quotesQ === '' && quotesSort === 'date_desc'}
                        onClick={() => {
                          setQuotesQ('');
                          setQuotesSort('date_desc');
                        }}
                        className="h-10 border border-dark bg-white text-xs font-bold uppercase lg:col-span-3 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Limpiar
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 max-w-full overflow-x-auto rounded border border-dark/10">
                    <table className="w-full min-w-[1400px] text-left">
                      <thead className="bg-dark text-xs font-extrabold uppercase tracking-tight text-light">
                        <tr>
                          <th className="w-[150px] px-4 py-3">Folio</th>
                          <th className="w-[200px] px-4 py-3">Cliente</th>
                          <th className="w-[220px] px-4 py-3">Correo</th>
                          <th className="w-[150px] px-4 py-3">Servicio</th>
                          <th className="w-[140px] px-4 py-3">Estado</th>
                          <th className="px-4 py-3">Resumen</th>
                          <th className="w-[160px] px-4 py-3">Fecha</th>
                          <th className="w-[100px] px-4 py-3">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredQuotes.map((quote) => {
                          const quoteHref = `/admin/servicios/${encodeRouteToken(quote.id)}`;
                          return (
                            <tr
                              key={quote.id}
                              className="cursor-pointer border-t border-dark/10 bg-white align-top hover:bg-primary/5"
                              role="button"
                              tabIndex={0}
                              onClick={() => navigate(quoteHref)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  navigate(quoteHref);
                                }
                              }}
                            >
                              <td className="w-[150px] px-4 py-3">
                                <p className="text-xs font-bold uppercase text-dark">{quote.orderId}</p>
                              </td>
                              <td className="w-[200px] px-4 py-3">
                                <p className="text-xs font-semibold text-dark">{quote.customerName}</p>
                              </td>
                              <td className="w-[220px] px-4 py-3 text-xs text-dark/75">{quote.customerEmail || '-'}</td>
                              <td className="w-[150px] px-4 py-3">
                                <TagChip label={quote.serviceMode} className="w-fit text-[10px]" />
                              </td>
                              <td className="w-[140px] px-4 py-3">
                                <TagChip
                                  label={formatQuoteStatus(quote.status)}
                                  className={`w-fit text-[10px] ${statusTone(quote.status)}`}
                                />
                              </td>
                              <td className="px-4 py-3 text-xs text-dark/80">
                                <p className="truncate max-w-[280px]">{quote.summary || '-'}</p>
                              </td>
                              <td className="w-[160px] px-4 py-3 text-xs text-dark/75">{formatDate(quote.requestedAt)}</td>
                              <td className="w-[100px] px-4 py-3">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-[220px] bg-white rounded-xl shadow-xl border border-gray-200 p-1">
                                    <DropdownMenuItem asChild className="flex flex-nowrap items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm font-medium text-dark">
                                      <a
                                        href={quoteHref}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex flex-row flex-nowrap items-center gap-2.5"
                                      >
                                        <Eye className="h-4 w-4 shrink-0 text-dark/40" />
                                        <span className="whitespace-nowrap">Ver en nuestro panel</span>
                                      </a>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          ) : null}

          {selectedCollectionHandle ? (
            <section className="mt-8 rounded border border-dark/10 bg-light p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-manrope text-2xl font-extrabold uppercase tracking-tight text-dark">
                    {catalogCollection?.title || selection.itemTitle}
                  </h2>
                  <TagChip label={`Total: ${catalogProducts.length}`} />
                </div>
                <Button asChild variant="action">
                  <a href={`/admin/productos/nuevo?view=${selection.view}`}>Agregar producto</a>
                </Button>
              </div>

              {catalogProducts.length === 0 ? (
                <p className="mt-3 text-sm text-dark/80">No hay productos en esta categoria.</p>
              ) : (
                <>
                  <div className="mt-6 rounded-xl border border-dark/10 bg-white p-4">
                    <div className="grid gap-3 lg:grid-cols-12">
                      <div className="relative lg:col-span-6">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tgray" />
                        <Input
                          type="search"
                          value={catalogQ}
                          onChange={(e) => setCatalogQ(e.target.value)}
                          placeholder="Buscar por nombre, SKU o fabricante..."
                          className="pl-10"
                        />
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            className="h-10 px-4 flex items-center bg-light border border-dark rounded-md text-xs font-bold uppercase lg:col-span-3"
                          >
                            {catalogSortLabel(catalogSort)}
                            <ChevronDown className="ml-2 h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px]">
                          <DropdownMenuItem onSelect={() => setCatalogSort('updated_at_desc')}>
                            Ultima actualización
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setCatalogSort('title_asc')}>
                            Nombre: A → Z
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setCatalogSort('price_desc')}>
                            Precio: alto → bajo
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setCatalogSort('price_asc')}>
                            Precio: bajo → alto
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={catalogQ === '' && catalogSort === 'updated_at_desc'}
                        onClick={() => {
                          setCatalogQ('');
                          setCatalogSort('updated_at_desc');
                        }}
                        className="h-10 border border-dark bg-white text-xs font-bold uppercase lg:col-span-3 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Limpiar
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 max-w-full overflow-x-auto rounded border border-dark/10">
                    <table className="w-full min-w-[1280px] text-left">
                      <thead className="bg-dark text-xs font-extrabold uppercase tracking-tight text-light">
                        <tr>
                          <th className="px-4 py-3">Producto</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3">Vendor</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3">SKU</th>
                          <th className="px-4 py-3">Precio</th>
                          <th className="px-4 py-3">Comparativo</th>
                          <th className="w-[210px] px-4 py-3">Actualizado</th>
                          <th className="w-[100px] px-4 py-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((product) => {
                          const href = `/admin/productos/${encodeRouteToken(product.id)}?view=${selection.view}`;
                          return (
                            <tr
                              key={product.id}
                              className="cursor-pointer border-t border-dark/10 bg-white align-top hover:bg-primary/5"
                              role="button"
                              tabIndex={0}
                              onClick={() => navigate(href)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  navigate(href);
                                }
                              }}
                            >
                              <td className="px-4 py-3">
                                <p className="text-xs font-bold uppercase text-dark">{product.title}</p>
                                <p className="text-xs text-tgray">/{product.handle}</p>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusTone(product.status)}`}
                                >
                                  {product.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-dark/80">{product.vendor || '-'}</td>
                              <td className="px-4 py-3 text-xs text-dark/80">{product.productType || '-'}</td>
                              <td className="px-4 py-3 text-xs text-dark/80">{product.variant?.sku || '-'}</td>
                              <td className="px-4 py-3 text-xs font-bold text-dark">
                                {product.variant ? formatMoney(product.variant.price || '0', 'MXN') : '-'}
                              </td>
                              <td className="px-4 py-3 text-xs text-dark/80">
                                {product.variant?.compareAtPrice ? formatMoney(product.variant.compareAtPrice, 'MXN') : '-'}
                              </td>
                              <td className="w-[210px] px-4 py-3 text-xs text-dark/75">{formatDate(product.updatedAt)}</td>
                              <td className="w-[100px] px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                                      aria-label="Acciones del producto"
                                    >
                                      <MoreHorizontal className="h-4 w-4 text-dark/60" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-[220px] bg-white rounded-xl shadow-xl border border-gray-200 p-1">
                                    {product.onlineStoreUrl && (
                                      <DropdownMenuItem asChild className="flex flex-nowrap items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm font-medium text-dark">
                                        <a href={product.onlineStoreUrl} target="_blank" rel="noreferrer">
                                          <Eye className="h-4 w-4 shrink-0 text-dark/40" />
                                          <span className="whitespace-nowrap">Ver en la tienda</span>
                                        </a>
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem asChild className="flex flex-nowrap items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm font-medium text-dark">
                                      <a
                                        href={`https://admin.shopify.com/store/translate3d/products/${product.id.match(/\/(\d+)$/)?.[1] || ''}`}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <ExternalLink className="h-4 w-4 shrink-0 text-dark/40" />
                                        <span className="whitespace-nowrap">Editar en Shopify</span>
                                      </a>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="flex flex-nowrap items-center gap-2.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm font-medium text-dark"
                                      onSelect={() => {
                                        const isActive = product.status.toUpperCase() === 'ACTIVE';
                                        const newStatus = isActive ? 'DRAFT' : 'ACTIVE';
                                        const label = isActive ? 'desactivar' : 'publicar';
                                        if (!confirm(`¿Deseas ${label} "${product.title}"?`)) return;
                                        const form = document.createElement('form');
                                        form.method = 'post';
                                        form.innerHTML = `<input name="intent" value="toggle_product_status"/><input name="productId" value="${product.id}"/><input name="newStatus" value="${newStatus}"/>`;
                                        document.body.appendChild(form);
                                        form.submit();
                                      }}
                                    >
                                      <Power className="h-4 w-4 shrink-0 text-dark/40" />
                                      <span className="whitespace-nowrap">{product.status.toUpperCase() === 'ACTIVE' ? 'Desactivar' : 'Publicar'}</span>
                                    </DropdownMenuItem>
                                    <div className="my-1 h-px bg-gray-100" />
                                    <DropdownMenuItem
                                      className="flex flex-nowrap items-center rounded-lg hover:bg-gray-50 cursor-pointer text-sm font-medium text-dark"
                                      onSelect={() => {
                                        if (!confirm(`¿Archivar "${product.title}"?`)) return;
                                        const form = document.createElement('form');
                                        form.method = 'post';
                                        form.innerHTML = `<input name="intent" value="archive_product"/><input name="productId" value="${product.id}"/>`;
                                        document.body.appendChild(form);
                                        form.submit();
                                      }}
                                    >
                                      <Archive className="h-4 w-4 shrink-0 text-dark/40" />
                                      <span className="whitespace-nowrap">Archivar</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="flex flex-nowrap items-center gap-2.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm font-medium text-dark"
                                      onSelect={() => {
                                        if (!confirm(`¿Eliminar "${product.title}"? Esta acción no se puede deshacer.`)) return;
                                        const form = document.createElement('form');
                                        form.method = 'post';
                                        form.innerHTML = `<input name="intent" value="delete_product"/><input name="productId" value="${product.id}"/>`;
                                        document.body.appendChild(form);
                                        form.submit();
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 shrink-0 text-dark/40" />
                                      <span className="whitespace-nowrap">Eliminar</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          ) : null}

          {selection.view === 'blog-articulos' ? (
            <section className="mt-8 rounded border border-dark/10 bg-light p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-manrope text-2xl font-extrabold uppercase tracking-tight text-dark">
                    Todos los articulos
                  </h2>
                  <TagChip label={`Total: ${blogPosts.length}`} />
                  <TagChip
                    label={`Publicados: ${blogPosts.filter((p) => p.publishedAt).length}`}
                    className="bg-emerald-50 text-emerald-600 border-emerald-200"
                  />
                  <TagChip
                    label={`Borradores: ${blogPosts.filter((p) => !p.publishedAt).length}`}
                    className="bg-amber-50 text-amber-600 border-amber-200"
                  />
                </div>
                <Button asChild variant="action">
                  <a href="https://admin.shopify.com/store/translate3d/content/articles" target="_blank" rel="noreferrer">
                    Crear articulo
                  </a>
                </Button>
              </div>

              {blogPosts.length === 0 ? (
                <p className="mt-3 text-sm text-dark/80">No hay articulos disponibles.</p>
              ) : (
                <>
                  <div className="mt-6 rounded-xl border border-dark/10 bg-white p-4">
                    <div className="grid gap-3 lg:grid-cols-12">
                      <div className="relative lg:col-span-6">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tgray" />
                        <Input
                          type="search"
                          value={blogQ}
                          onChange={(e) => setBlogQ(e.target.value)}
                          placeholder="Buscar por titulo, autor, handle..."
                          className="pl-10"
                        />
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            className="h-10 px-4 flex items-center bg-light border border-dark rounded-md text-xs font-bold uppercase lg:col-span-3"
                          >
                            {blogSortLabel(blogSort)}
                            <ChevronDown className="ml-2 h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px]">
                          <DropdownMenuItem onSelect={() => setBlogSort('updated_desc')}>
                            Mas recientes
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setBlogSort('updated_asc')}>
                            Mas antiguos
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setBlogSort('published_desc')}>
                            Publicación
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setBlogSort('title_asc')}>
                            Titulo: A → Z
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setBlogSort('author_asc')}>
                            Autor: A → Z
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={blogQ === '' && blogSort === 'updated_desc'}
                        onClick={() => {
                          setBlogQ('');
                          setBlogSort('updated_desc');
                        }}
                        className="h-10 border border-dark bg-white text-xs font-bold uppercase lg:col-span-3 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Limpiar
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 max-w-full overflow-x-auto rounded border border-dark/10">
                    <table className="w-full min-w-[1220px] text-left">
                      <thead className="bg-dark text-xs font-extrabold uppercase tracking-tight text-light">
                        <tr>
                          <th className="w-[350px] px-4 py-3">Articulo</th>
                          <th className="w-[150px] px-4 py-3">Autor</th>
                          <th className="w-[120px] px-4 py-3">Estado</th>
                          <th className="w-[190px] px-4 py-3">Publicado</th>
                          <th className="w-[190px] px-4 py-3">Actualizado</th>
                          <th className="w-[100px] px-4 py-3">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBlogPosts.map((post) => (
                          <tr
                            key={post.id}
                            className="cursor-pointer border-t border-dark/10 bg-white align-top hover:bg-primary/5"
                            role="button"
                            tabIndex={0}
                            onClick={() => window.open(post.adminEditUrl, '_blank')}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                window.open(post.adminEditUrl, '_blank');
                              }
                            }}
                          >
                            <td className="w-[350px] px-4 py-3">
                              <p className="text-xs font-bold uppercase text-dark">{post.title}</p>
                              <p className="text-xs text-tgray">/{post.handle}</p>
                            </td>
                            <td className="w-[150px] px-4 py-3 text-xs font-semibold text-dark/80">{post.authorName}</td>
                            <td className="w-[120px] px-4 py-3">
                              <TagChip
                                label={post.publishedAt ? 'Publicado' : 'Borrador'}
                                className={`w-fit text-[10px] ${post.publishedAt ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}
                              />
                            </td>
                            <td className="w-[190px] px-4 py-3 text-xs text-dark/75">
                              {post.publishedAt ? formatDate(post.publishedAt) : '-'}
                            </td>
                            <td className="w-[190px] px-4 py-3 text-xs text-dark/75">{formatDate(post.updatedAt)}</td>
                            <td className="w-[100px] px-4 py-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[220px] bg-white rounded-xl shadow-xl border border-gray-200 p-1">
                                  <DropdownMenuItem asChild className="flex flex-nowrap items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm font-medium text-dark">
                                    <a
                                      href={post.publicUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex flex-row flex-nowrap items-center gap-2.5"
                                    >
                                      <Eye className="h-4 w-4 shrink-0 text-dark/40" />
                                      <span className="whitespace-nowrap">Ver en el sitio</span>
                                    </a>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild className="flex flex-nowrap items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm font-medium text-dark">
                                    <a
                                      href={post.adminEditUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex flex-row flex-nowrap items-center gap-2.5"
                                    >
                                      <ExternalLink className="h-4 w-4 shrink-0 text-dark/40" />
                                      <span className="whitespace-nowrap">Editar en Shopify</span>
                                    </a>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="flex flex-nowrap items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm font-medium text-dark"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const form = document.createElement('form');
                                      form.method = 'POST';
                                      form.style.display = 'none';
                                      const intentInput = document.createElement('input');
                                      intentInput.name = 'intent';
                                      intentInput.value = 'toggle_article_visibility';
                                      form.appendChild(intentInput);
                                      const idInput = document.createElement('input');
                                      idInput.name = 'articleId';
                                      idInput.value = post.id;
                                      form.appendChild(idInput);
                                      const publishInput = document.createElement('input');
                                      publishInput.name = 'publish';
                                      publishInput.value = post.publishedAt ? 'false' : 'true';
                                      form.appendChild(publishInput);
                                      document.body.appendChild(form);
                                      form.submit();
                                    }}
                                  >
                                    {post.publishedAt ? (
                                      <EyeOff className="h-4 w-4 shrink-0 text-dark/40" />
                                    ) : (
                                      <Eye className="h-4 w-4 shrink-0 text-dark/40" />
                                    )}
                                    <span className="whitespace-nowrap">
                                      {post.publishedAt ? 'Ocultar' : 'Mostrar'}
                                    </span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          ) : null}

          {selection.view !== 'pedidos-todos' &&
            selection.view !== 'servicios-solicitudes' &&
            selection.view !== 'blog-articulos' &&
            !selectedCollectionHandle ? (
            <section className="mt-8 rounded border border-dark/10 bg-light p-6">
              <h2 className="font-manrope text-2xl font-extrabold uppercase tracking-tight text-dark">
                {selection.itemTitle}
              </h2>
              <p className="mt-3 text-sm text-dark/80">
                Esta seccion quedo preparada. Continuamos con esta vista en el siguiente paso.
              </p>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}

const ADMIN_CUSTOMER_QUERY = `
  query AdminCustomer($language: LanguageCode) @inContext(language: $language) {
    customer {
      id
      firstName
      lastName
      emailAddress {
        emailAddress
      }
    }
  }
` as const;
