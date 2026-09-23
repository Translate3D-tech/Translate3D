import { ArrowDown } from 'lucide-react';
import { Link, useFetcher } from 'react-router';
import { cn, focusStyle } from '~/lib/utils';

type TrackerFetcherData =
  | {
    ok: true;
    kind: 'shopify_order';
    reference: string;
    order: {
      id: string;
      name: string;
      createdAt: string;
      cancelledAt: string | null;
      displayFinancialStatus: string;
      displayFulfillmentStatus: string;
      totalAmount: string;
      currencyCode: string;
    };
  }
  | {
    ok: true;
    kind: 'service_quote';
    reference: string;
    quote: {
      id: string;
      orderId: string;
      serviceMode: string;
      status: string;
      requestedAt: string;
    };
  }
  | {
    ok: false;
    message: string;
  };

function formatStatus(value: string) {
  const key = value.toUpperCase();
  const labels: Record<string, string> = {
    PENDING: 'Pago pendiente',
    AUTHORIZED: 'Pago autorizado',
    PAID: 'Pagado',
    PARTIALLY_PAID: 'Pago parcial',
    PARTIALLY_REFUNDED: 'Reembolso parcial',
    REFUNDED: 'Reembolsado',
    VOIDED: 'Anulado',
    UNFULFILLED: 'Sin preparar',
    PARTIALLY_FULFILLED: 'Preparación parcial',
    FULFILLED: 'Preparado',
    IN_PROGRESS: 'En preparación',
    ON_HOLD: 'En pausa',
  };

  return labels[key] || key.replace(/_/g, ' ').toLowerCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(value));
}

function formatMoney(amount: string, currencyCode: string) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currencyCode || 'MXN',
  }).format(Number(amount || '0'));
}

export function OrderTracker({
  variant = 'hero',
  className,
}: {
  variant?: 'hero' | 'footer';
  className?: string;
}) {
  const fetcher = useFetcher<TrackerFetcherData>();
  const isSubmitting = fetcher.state !== 'idle';
  const isFooter = variant === 'footer';

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-6 font-extrabold',
        isFooter ? 'rounded bg-primary p-5 text-white md:gap-10' : 'text-white',
        className,
      )}
    >
      <div className="flex justify-between">
        <p className="flex flex-wrap justify-between gap-4 text-[10px] font-normal leading-[100%] md:gap-20">
          <span className="w-full md:w-auto">RASTREADOR</span>
          <span>
            ¿YA
            <br /> HAS COMPRADO
            <br /> CON NOSOTROS?
          </span>
          <span className={cn(isFooter && 'hidden md:block')}>
            BUSCA
            <br /> RÁPIDAMENTE EL
            <br /> ESTATUS DE TU PEDIDO
          </span>
        </p>
        <ArrowDown className="h-4 w-4 text-white" />
      </div>

      <fetcher.Form method="post" action="/api/order-tracker" className="flex flex-col">
        <div className="flex w-full items-end justify-between gap-4">
          <input
            type="text"
            name="reference"
            required
            placeholder="Folio de seguimiento o cotización"
            disabled={isSubmitting}
            className={cn(
              'min-w-0 flex-1 rounded bg-transparent text-[24px] uppercase tracking-tight md:text-[52px] lg:text-[64px]',
              'placeholder:text-white/60 placeholder:focus:text-white/40 focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-70',
              focusStyle({ theme: 'action' }),
            )}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'whitespace-nowrap rounded text-center text-[24px] uppercase tracking-tight text-white md:text-[52px] lg:text-[64px]',
              'disabled:cursor-not-allowed disabled:opacity-60',
              focusStyle({ theme: 'action' }),
            )}
          >
            {isSubmitting ? 'Buscando' : 'Buscar'}
          </button>
        </div>
        <div className="-mt-1 h-2 w-full rounded bg-white md:-mt-2 md:h-4" />

        <TrackerStatus data={fetcher.data} isSubmitting={isSubmitting} />
      </fetcher.Form>
    </div>
  );
}

function TrackerStatus({
  data,
  isSubmitting,
}: {
  data: TrackerFetcherData | undefined;
  isSubmitting: boolean;
}) {
  if (isSubmitting) {
    return (
      <div className="mt-3 rounded border border-white/30 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-tight text-white">
        Buscando folio...
      </div>
    );
  }

  if (!data) return null;

  if (!data.ok) {
    return (
      <div className="mt-3 rounded border border-red-300/80 bg-red-500/20 px-3 py-2 text-xs font-bold uppercase tracking-tight text-white">
        {data.message}
      </div>
    );
  }

  if (data.kind === 'shopify_order') {
    return (
      <div className="mt-3 rounded border border-green-300/80 bg-green-500/15 px-3 py-2 text-xs font-bold uppercase tracking-tight text-white">
        <p>Pedido encontrado: {data.order.name}</p>
        <p className="mt-1">Pago: {formatStatus(data.order.displayFinancialStatus)}</p>
        <p className="mt-1">
          {data.order.cancelledAt
            ? 'Estado: Pedido cancelado'
            : `Envío: ${formatStatus(data.order.displayFulfillmentStatus)}`}
        </p>
        <p className="mt-1">Total: {formatMoney(data.order.totalAmount, data.order.currencyCode)}</p>
        <p className="mt-1">Fecha: {formatDate(data.order.createdAt)}</p>
        <p className="mt-1 font-semibold normal-case tracking-normal text-white/90">
          Revisa el detalle completo en{' '}
          <Link to="/account/orders" className="underline">
            Mi cuenta → Pedidos
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded border border-green-300/80 bg-green-500/15 px-3 py-2 text-xs font-bold uppercase tracking-tight text-white">
      <p>Cotización encontrada: {data.quote.orderId}</p>
      <p className="mt-1">Servicio: {data.quote.serviceMode}</p>
      <p className="mt-1">Estado: {formatStatus(data.quote.status)}</p>
      <p className="mt-1">Fecha: {formatDate(data.quote.requestedAt)}</p>
      <p className="mt-1 font-semibold normal-case tracking-normal text-white/90">
        Revisa el detalle completo en{' '}
        <Link to="/account/cotizaciones" className="underline">
          Mi cuenta → Cotizaciones
        </Link>
        .
      </p>
    </div>
  );
}
