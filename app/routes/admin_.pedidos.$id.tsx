import { data, redirect, useLoaderData } from 'react-router';
import type { Route } from './+types/admin_.pedidos.$id';
import { AdminSidebar } from '~/components/admin/AdminSidebar';
import { Button } from '~/components/ui/button';
import { ExternalLink, Menu } from 'lucide-react';
import { useState } from 'react';
import { getAdminOrderDetails, isAdminCustomer } from '~/lib/shopifyAdmin.server';
import { decodeRouteToken } from '~/lib/urlTokens';
import { createOrderTrackingReference } from '~/lib/orderTracking.server';
import { Image } from '@shopify/hydrogen';
import { TagChip } from '~/components/landing/TagChip';

export const meta: Route.MetaFunction = ({ data }) => [
  { title: data?.order ? `${data.order.name} | Admin` : 'Detalle de pedido | Admin' },
];

function extractNumericId(gid: string): string {
  const match = gid.match(/\/(\d+)$/);
  return match?.[1] || '';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(value));
}

function formatMoney(amount: string | number, currencyCode: string) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currencyCode || 'MXN',
  }).format(Number(amount || '0'));
}

function statusTone(status: string) {
  const value = status.toLowerCase();
  if (
    value.includes('paid') ||
    value.includes('fulfilled') ||
    value.includes('approved') ||
    value.includes('completed') ||
    value.includes('pagad') ||
    value.includes('completad')
  ) {
    return 'border-green-600/25 bg-green-50 text-green-700';
  }
  if (
    value.includes('cancel') ||
    value.includes('void') ||
    value.includes('refunded') ||
    value.includes('rejected')
  ) {
    return 'border-red-600/25 bg-red-50 text-red-700';
  }
  return 'border-primary/30 bg-primary/10 text-primary';
}

function statusPillClasses(status: string) {
  const value = status.toUpperCase();
  if (
    value.includes('PAID') ||
    value.includes('FULFILLED') ||
    value.includes('COMPLETED')
  ) {
    return 'bg-emerald-50 text-emerald-600';
  }
  if (
    value.includes('CANCEL') ||
    value.includes('VOID') ||
    value.includes('REFUNDED') ||
    value.includes('REJECTED')
  ) {
    return 'bg-red-50 text-red-600';
  }
  return 'bg-amber-50 text-amber-600';
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
    UNFULFILLED: 'No preparado',
    PARTIALLY_FULFILLED: 'Preparación parcial',
    FULFILLED: 'Preparado',
    IN_PROGRESS: 'En preparación',
    ON_HOLD: 'En pausa',
    SCHEDULED: 'Programado',
  };
  return labels[key] || key.replace(/_/g, ' ').toLowerCase();
}

function addressLines(address: {
  name: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  zip: string;
  country: string;
} | null) {
  if (!address) return [];
  const locality = [address.zip, address.city, address.province].filter(Boolean).join(' ');
  return [address.name, address.address1, address.address2, locality, address.country].filter(Boolean);
}

function buildTimeline(status: string, createdAt: string, cancelledAt: string | null) {
  const steps = [{ label: 'Pedido recibido', date: formatDate(createdAt) }];
  if (cancelledAt) {
    steps.push({ label: 'Pedido cancelado', date: formatDate(cancelledAt) });
  } else if (status !== 'UNFULFILLED') {
    steps.push({ label: formatFulfillmentStatus(status), date: '' });
  }
  return steps;
}

async function getAdminViewer(context: Route.LoaderArgs['context']) {
  const isLoggedIn = await context.customerAccount.isLoggedIn();
  if (!isLoggedIn) {
    return { ok: false as const, redirectTo: '/account/login' };
  }

  const { data: customerData, errors } = await context.customerAccount.query(ADMIN_CUSTOMER_QUERY, {
    variables: { language: context.customerAccount.i18n.language },
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
    accountName:
      [customerData.customer.firstName, customerData.customer.lastName].filter(Boolean).join(' ').trim() ||
      customerData.customer.emailAddress?.emailAddress ||
      'Mi perfil',
  };
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const viewer = await getAdminViewer(context);
  if (!viewer.ok) return redirect(viewer.redirectTo);

  if (!params.id) return redirect('/admin?view=pedidos-todos');

  let orderId = params.id;
  try {
    orderId = decodeRouteToken(params.id);
  } catch {
    try {
      orderId = decodeURIComponent(params.id);
    } catch {
      orderId = params.id;
    }
  }

  const order = await getAdminOrderDetails(context.env, orderId);
  if (!order) throw new Response('Pedido no encontrado', { status: 404 });

  return data({
    order,
    viewerName: viewer.accountName,
    shopifyNumericId: extractNumericId(order.id),
    trackingReference: await createOrderTrackingReference(context.env, order.id),
  });
}

export default function AdminOrderDetailsRoute() {
  const { order, viewerName, shopifyNumericId, trackingReference } = useLoaderData<typeof loader>();
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  const timeline = buildTimeline(order.displayFulfillmentStatus, order.createdAt, order.cancelledAt);
  const total = Number(order.totalAmount || '0');
  const paidAmount = order.displayFinancialStatus.toUpperCase().includes('PAID') ? total : 0;
  const pendingAmount = Math.max(0, total - paidAmount);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F6F6F7]">
      <AdminSidebar
        activeView="pedidos-todos"
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        mobileOpen={isSidebarMobileOpen}
        onMobileClose={() => setSidebarMobileOpen(false)}
        viewerLabel={viewerName || 'Mi perfil'}
      />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
        {/* ─── Top bar (matches product detail) ─── */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white/80 px-6 backdrop-blur md:h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarMobileOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-50 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <a href="/admin?view=pedidos-todos" className="hover:underline">Pedidos</a>
              <span>/</span>
              <h1 className="text-dark font-semibold truncate max-w-[200px] sm:max-w-none">{order.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-dark">{viewerName}</p>
              <p className="text-xs text-brand-orange">Administrador</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold text-xs">
              {viewerName[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-5xl px-6 py-8">
          {/* ─── Page header (matches product detail) ─── */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-200 pb-6 mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-dark">{order.name}</h2>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Button
                variant="ghost"
                className="flex-1 md:flex-none border-gray-200"
                type="button"
                asChild
              >
                <a href="/admin?view=pedidos-todos">Volver</a>
              </Button>
              <Button
                variant="ghost"
                className="flex-1 md:flex-none"
                type="button"
                asChild
              >
                <a
                  href={`https://admin.shopify.com/store/translate3d/orders/${shopifyNumericId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={14} className="mr-1.5" />
                  Ver en Shopify
                </a>
              </Button>
            </div>
          </div>

          {/* ─── Shopify Admin link card (matches product detail) ─── */}
          <a
            href={`https://admin.shopify.com/store/translate3d/orders/${shopifyNumericId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-[#004C3F]/5 border border-[#004C3F]/15 rounded-xl hover:bg-[#004C3F]/10 transition-colors group mb-6"
          >
            <div className="p-2 bg-[#004C3F] rounded-lg shrink-0">
              <ExternalLink size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-dark">Ver pedido en Shopify Admin</p>
              <p className="text-xs text-gray-500 mt-0.5">Gestiona pagos, envíos, reembolsos y más acciones avanzadas.</p>
            </div>
            <ExternalLink size={14} className="text-gray-400 group-hover:text-[#004C3F] transition-colors shrink-0" />
          </a>

          {/* ─── Order info + confirmation ─── */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Fecha del pedido</p>
                <p className="text-lg font-bold text-dark mt-0.5">{formatDate(order.createdAt)}</p>
              </div>
              {order.confirmationNumber ? (
                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Confirmación</p>
                  <p className="text-lg font-bold text-dark mt-0.5 font-mono">#{order.confirmationNumber}</p>
                </div>
              ) : null}
              <div className="text-left sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Folio de seguimiento</p>
                <p className="text-lg font-bold text-dark mt-0.5 font-mono">{trackingReference}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ─── Left Column ─── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Fulfillment Status */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-dark">Estado de preparación</h3>
                <p className="text-sm text-gray-500 mt-0.5">Progreso del envío del pedido</p>
                <div className="mt-5 space-y-4">
                  {timeline.map((step) => (
                    <div key={step.label} className="flex items-start gap-3">
                      <div className="mt-1.5 h-3 w-3 rounded-full bg-brand-orange/80 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-dark">{step.label}</p>
                        {step.date ? <p className="text-xs text-gray-400">{step.date}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer & Addresses */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-dark">Información del cliente</h3>
                <div className="mt-4 grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Cliente</p>
                    <p className="mt-1 text-sm font-bold text-dark">{order.customerName}</p>
                    <p className="text-sm text-gray-500">{order.customerEmail || '-'}</p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    <TagChip label={formatFinancialStatus(order.displayFinancialStatus)} className={`w-fit text-xs ${statusTone(order.displayFinancialStatus)}`} />
                    <TagChip
                      label={order.cancelledAt ? 'Pedido cancelado' : formatFulfillmentStatus(order.displayFulfillmentStatus)}
                      className={`w-fit text-xs ${statusTone(order.cancelledAt ? 'CANCELLED' : order.displayFulfillmentStatus)}`}
                    />
                  </div>
                </div>

                <div className="mt-6 grid gap-6 sm:grid-cols-2 border-t border-gray-100 pt-5">
                  <InfoBlock title="Dirección de envío" lines={addressLines(order.shippingAddress)} />
                  <InfoBlock title="Dirección de facturación" lines={addressLines(order.billingAddress)} />
                </div>
              </div>

              {/* Tags */}
              {order.tags && order.tags.length > 0 ? (
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold text-dark">Etiquetas</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded-md border border-dark/15 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-dark"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* ─── Right Column (Order Summary) ─── */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-dark">Resumen del pedido</h3>
                <div className="mt-4 space-y-3">
                  {order.lineItems.map((item) => (
                    <article key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                      <div className="flex min-w-0 items-start gap-3">
                        {item.imageUrl ? (
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
                            <Image src={item.imageUrl} alt={item.imageAlt} width={96} height={96} className="h-full w-full object-cover" />
                          </div>
                        ) : null}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-dark">{item.title}</p>
                          {item.variantTitle ? <p className="text-xs text-gray-400">{item.variantTitle}</p> : null}
                          <p className="text-xs text-gray-400">Cantidad: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-dark whitespace-nowrap">
                        {formatMoney(Number(item.unitAmount) * Number(item.quantity), order.currencyCode)}
                      </p>
                    </article>
                  ))}
                </div>

                <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-500">Subtotal</span>
                    <span className="font-semibold text-dark">{formatMoney(order.subtotalAmount, order.currencyCode)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-500">Envío</span>
                    <span className="font-semibold text-dark">
                      {Number(order.totalShippingAmount) <= 0 ? 'Gratis' : formatMoney(order.totalShippingAmount, order.currencyCode)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-500">Impuestos</span>
                    <span className="font-semibold text-dark">{formatMoney(order.totalTaxAmount, order.currencyCode)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                    <span className="text-base font-bold text-dark">Total</span>
                    <span className="text-base font-bold text-dark">{formatMoney(order.totalAmount, order.currencyCode)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-500">Pagado</span>
                    <span className="font-semibold text-dark">{formatMoney(paidAmount, order.currencyCode)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-500">Pendiente</span>
                    <span className="font-semibold text-dark">{formatMoney(pendingAmount, order.currencyCode)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      <div className="mt-2 space-y-1 text-sm text-dark/85">
        {lines.length ? lines.map((line) => <p key={`${title}-${line}`}>{line}</p>) : <p className="text-gray-400">No registrada</p>}
      </div>
    </section>
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
