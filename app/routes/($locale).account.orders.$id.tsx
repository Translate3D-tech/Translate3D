import {Image} from '@shopify/hydrogen';
import {redirect, useLoaderData, useOutletContext} from 'react-router';
import type {Route} from './+types/($locale).account.orders.$id';
import type {CustomerFragment, OrderLineItemFullFragment} from 'customer-accountapi.generated';
import {Button} from '~/components/ui/button';
import {CUSTOMER_ORDER_QUERY} from '~/graphql/customer-account/CustomerOrderQuery';
import {createOrderTrackingReference} from '~/lib/orderTracking.server';
import type {ReactNode} from 'react';

export const meta: Route.MetaFunction = ({data}) => [{title: `Pedido ${data?.order?.name || ''}`}];

function toMoneyAmount(value?: {amount: string} | null) {
  return Number(value?.amount || '0');
}

function extractVariantNumericId(gid?: string | null) {
  if (!gid) return null;
  const parts = gid.split('/');
  const last = parts[parts.length - 1];
  return /^\d+$/.test(last || '') ? last : null;
}

function buildBuyAgainPath(lineItems: Array<OrderLineItemFullFragment & {variantId?: string | null}>) {
  const lines = lineItems
    .map((line) => {
      const variantId = extractVariantNumericId(line.variantId);
      if (!variantId) return null;
      const quantity = Math.max(1, Number(line.quantity || 1));
      return `${variantId}:${quantity}`;
    })
    .filter(Boolean) as string[];

  return lines.length > 0 ? `/cart/${lines.join(',')}` : '/tienda';
}

function formatStatusLabel(value?: string | null) {
  const key = (value || 'PENDING').toUpperCase();
  const map: Record<string, string> = {
    UNFULFILLED: 'Sin preparar',
    PARTIALLY_FULFILLED: 'Preparación parcial',
    FULFILLED: 'Preparado',
    IN_PROGRESS: 'En preparación',
    ON_HOLD: 'En pausa',
    PENDING: 'Pago pendiente',
    AUTHORIZED: 'Pago autorizado',
    PAID: 'Pagado',
    PARTIALLY_PAID: 'Pago parcial',
    PARTIALLY_REFUNDED: 'Reembolso parcial',
    REFUNDED: 'Reembolsado',
    VOIDED: 'Anulado',
  };
  return map[key] || key.replace(/_/g, ' ').toLowerCase();
}

function getFinancialStatusView(value?: string | null) {
  const key = (value || '').toUpperCase();
  const map: Record<
    string,
    {label: string; helper: string; isPending: boolean}
  > = {
    PENDING: {
      label: 'Pago pendiente',
      helper: 'El pago aún no se ha completado.',
      isPending: true,
    },
    AUTHORIZED: {
      label: 'Pago autorizado',
      helper: 'El pago está autorizado y en proceso de captura.',
      isPending: true,
    },
    PARTIALLY_PAID: {
      label: 'Pago parcial',
      helper: 'El pedido tiene un saldo pendiente.',
      isPending: true,
    },
    PAID: {label: 'Pagado', helper: 'Pago liquidado.', isPending: false},
    PARTIALLY_REFUNDED: {
      label: 'Reembolso parcial',
      helper: 'Se aplicó un reembolso parcial.',
      isPending: false,
    },
    REFUNDED: {
      label: 'Reembolsado',
      helper: 'El pago fue reembolsado.',
      isPending: false,
    },
    VOIDED: {label: 'Anulado', helper: 'El pago fue anulado.', isPending: false},
  };

  return (
    map[key] ?? {
      label: key ? key.replace(/_/g, ' ').toLowerCase() : 'Sin información',
      helper: 'No hay información completa del estado de pago.',
      isPending: false,
    }
  );
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currencyCode || 'MXN',
  }).format(amount);
}

function buildFulfillmentTimeline(fulfillmentStatus: string, processedAt: string, cancelledAt?: string | null) {
  const timeline = [{label: 'Pedido recibido', date: formatLongDate(processedAt)}];
  if (cancelledAt) {
    timeline.push({label: 'Pedido cancelado', date: formatLongDate(cancelledAt)});
  } else if (fulfillmentStatus !== 'UNFULFILLED') {
    timeline.push({label: formatStatusLabel(fulfillmentStatus), date: ''});
  }
  return timeline;
}

export async function loader({params, context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  if (!params.id) return redirect('/account/orders');

  let orderId = '';
  try {
    orderId = atob(decodeURIComponent(params.id));
  } catch {
    return redirect('/account/orders');
  }

  const {data, errors} = (await customerAccount.query(CUSTOMER_ORDER_QUERY, {
    variables: {
      orderId,
      language: customerAccount.i18n.language,
    },
  })) as {data: {order?: any}; errors?: Array<{message: string}>};

  if (errors?.length || !data?.order) {
    throw new Error('Pedido no encontrado');
  }

  const order = data.order as any;
  const lineItems = order.lineItems.nodes as Array<OrderLineItemFullFragment & {variantId?: string | null}>;
  const fulfillmentStatus = order.fulfillmentStatus ?? 'UNFULFILLED';
  const trackingReference = await createOrderTrackingReference(context.env, order.id);

  return {
    order,
    lineItems,
    fulfillmentStatus,
    trackingReference,
    buyAgainPath: buildBuyAgainPath(lineItems),
  };
}

export default function OrderRoute() {
  const {order, lineItems, fulfillmentStatus, trackingReference, buyAgainPath} = useLoaderData<typeof loader>();
  const {customer} = useOutletContext<{customer: CustomerFragment}>();

  const processedDate = order.processedAt ? formatLongDate(order.processedAt) : '';
  const customerName = order.shippingAddress?.name || [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || 'Cliente';
  const customerEmail = customer.emailAddress?.emailAddress || 'Sin correo';
  const subtotal = toMoneyAmount(order.subtotal);
  const taxes = toMoneyAmount(order.totalTax);
  const total = toMoneyAmount(order.totalPrice);
  const shipping = Math.max(0, total - subtotal - taxes);
  const currencyCode = order.totalPrice.currencyCode;
  const financialStatus = getFinancialStatusView(order.financialStatus);
  const timeline = buildFulfillmentTimeline(
    String(fulfillmentStatus),
    String(order.processedAt || new Date()),
    order.cancelledAt,
  );

  return (
    <section className="rounded-2xl border border-dark/10 bg-white p-4 text-dark md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-dark/10 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-tight text-dark/70">Pedido {order.name}</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-dark">Fecha de confirmación: {processedDate}</h2>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-tight text-dark/60">{trackingReference}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <a href={buyAgainPath}>Volver a comprar</a>
          </Button>
          {order.statusPageUrl ? (
            <Button asChild variant="action" size="sm">
              <a href={order.statusPageUrl} target="_blank" rel="noreferrer">
                Seguimiento con Shop
              </a>
            </Button>
          ) : null}
        </div>
      </header>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-4">
          <article className="rounded-2xl border border-dark/10 bg-light p-4">
            <h3 className="text-lg font-extrabold text-dark">
              Estado de preparación: {order.cancelledAt ? 'Pedido cancelado' : formatStatusLabel(fulfillmentStatus)}
            </h3>
            <div className="mt-3 space-y-2">
              {timeline.map((step) => (
                <div key={step.label} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-dark/70" />
                  <div>
                    <p className="text-sm font-bold text-dark">{step.label}</p>
                    {step.date ? <p className="text-xs text-dark/60">{step.date}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-dark/10 bg-light p-4">
            <h3 className="text-base font-extrabold uppercase tracking-tight text-dark">Detalles del pedido</h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <InfoBlock title="Información de contacto">
                  <p>{customerName}</p>
                  <p>{customerEmail}</p>
                </InfoBlock>
                <InfoBlock title="Dirección de envío">
                  {order.shippingAddress?.formatted?.map((line: string) => (
                    <p key={`shipping-${line}`}>{line}</p>
                  )) || <p>Sin dirección de envío</p>}
                </InfoBlock>
              </div>
              <div className="space-y-3">
                <InfoBlock title="Método de envío">
                  <p>{shipping > 0 ? 'Envío estándar' : 'Envío gratis'}</p>
                </InfoBlock>
                <InfoBlock title="Dirección de facturación">
                  {order.shippingAddress?.formatted?.map((line: string) => (
                    <p key={`billing-${line}`}>{line}</p>
                  )) || <p>Sin dirección de facturación</p>}
                </InfoBlock>
                <InfoBlock title="Estado del pago">
                  <p>{financialStatus.label}</p>
                </InfoBlock>
              </div>
            </div>
          </article>
        </div>

        <aside className="space-y-4">
          <article className="rounded-2xl border border-dark/10 bg-light p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-lg font-extrabold">{formatMoney(total, currencyCode)}</p>
              {financialStatus.isPending && order.statusPageUrl ? (
                <Button asChild variant="action" size="sm">
                  <a href={order.statusPageUrl} target="_blank" rel="noreferrer">
                    Pagar ahora
                  </a>
                </Button>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-dark/60">{financialStatus.helper}</p>
          </article>

          <article className="rounded-2xl border border-dark/10 bg-light p-4">
            <h3 className="text-base font-extrabold uppercase tracking-tight">Resumen del pedido</h3>
            <div className="mt-3 space-y-2">
              {lineItems.map((lineItem) => (
                <OrderLineSummary key={lineItem.id} lineItem={lineItem} />
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-dark/10 pt-3 text-sm">
              <Row label="Subtotal" value={formatMoney(subtotal, currencyCode)} />
              <Row label="Envío" value={shipping <= 0 ? 'Gratis' : formatMoney(shipping, currencyCode)} />
              <Row label="Impuestos" value={formatMoney(taxes, currencyCode)} />
              <Row label="Total" value={formatMoney(total, currencyCode)} strong />
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}

function InfoBlock({title, children}: {title: string; children: ReactNode}) {
  return (
    <section>
      <p className="text-xs font-extrabold uppercase tracking-tight text-dark/70">{title}</p>
      <div className="mt-1 space-y-1 text-sm text-dark/85">{children}</div>
    </section>
  );
}

function Row({label, value, strong = false}: {label: string; value: string; strong?: boolean}) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? 'font-extrabold text-dark' : 'font-medium text-dark/80'}>{label}</span>
      <span className={strong ? 'font-extrabold text-dark' : 'font-semibold text-dark'}>{value}</span>
    </div>
  );
}

function OrderLineSummary({lineItem}: {lineItem: OrderLineItemFullFragment}) {
  const unit = Number(lineItem.price?.amount || '0');
  const quantity = Number(lineItem.quantity || 0);
  const lineTotal = unit * quantity;
  const currencyCode = lineItem.price?.currencyCode || 'MXN';

  return (
    <article className="flex items-start justify-between gap-3 rounded-xl border border-dark/10 bg-white p-3">
      <div className="flex min-w-0 items-start gap-3">
        {lineItem.image ? (
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-dark/10 bg-lightgray">
            <Image data={lineItem.image} width={96} height={96} />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-dark">{lineItem.title}</p>
          {lineItem.variantTitle ? <p className="text-xs text-dark/70">{lineItem.variantTitle}</p> : null}
          <p className="text-xs text-dark/70">Cantidad: {quantity}</p>
        </div>
      </div>
      <p className="text-sm font-bold text-dark">
        {new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: currencyCode,
        }).format(lineTotal)}
      </p>
    </article>
  );
}
