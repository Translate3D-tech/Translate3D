import { Image, Money, getPaginationVariables } from '@shopify/hydrogen';
import { Link, useLoaderData } from 'react-router';
import { useMemo, useState } from 'react';
import type { Route } from './+types/($locale).account.orders._index';
import type { OrderItemFragment } from 'customer-accountapi.generated';
import { CUSTOMER_ORDERS_QUERY } from '~/graphql/customer-account/CustomerOrdersQuery';
import { createOrderTrackingReference } from '~/lib/orderTracking.server';
import { Button } from '~/components/ui/button';
import { TagChip } from '~/components/landing/TagChip';
import { Input } from '~/components/ui/input';
import { AccountSectionLayout } from '~/components/account/AccountSectionLayout';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { ClientOnly } from '~/components/ClientOnly';

type OrderSort = 'fecha_desc' | 'fecha_asc' | 'monto_desc' | 'monto_asc';

type OrderFilters = {
  q: string;
  sort: OrderSort;
  min: string;
  max: string;
};

type OrdersLoaderData = {
  orders: Array<OrderItemFragment>;
  filters: OrderFilters;
  orderTrackingRefs: Record<string, string>;
};

export const meta: Route.MetaFunction = () => [{ title: 'Pedidos' }];

export async function loader({ request, context }: Route.LoaderArgs) {
  const { customerAccount } = context;
  const url = new URL(request.url);
  const paginationVariables = getPaginationVariables(request, { pageBy: 150 });

  const filters: OrderFilters = {
    q: String(url.searchParams.get('q') || '').trim(),
    sort: normalizeSort(String(url.searchParams.get('sort') || 'fecha_desc').trim()),
    min: String(url.searchParams.get('min') || '').trim(),
    max: String(url.searchParams.get('max') || '').trim(),
  };

  const { data, errors } = await customerAccount.query(CUSTOMER_ORDERS_QUERY, {
    variables: {
      ...paginationVariables,
      query: undefined,
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw Error('No se encontraron pedidos del cliente');
  }

  const orders = data.customer.orders.nodes as Array<OrderItemFragment>;
  const orderTrackingEntries = await Promise.all(
    orders.map(async (order: { id: string }) => [order.id, await createOrderTrackingReference(context.env, order.id)] as const),
  );

  return {
    orders,
    filters,
    orderTrackingRefs: Object.fromEntries(orderTrackingEntries),
  } satisfies OrdersLoaderData;
}

export default function Orders() {
  const { orders, filters, orderTrackingRefs } = useLoaderData<OrdersLoaderData>();
  const [q, setQ] = useState(filters.q);
  const [sort, setSort] = useState<OrderSort>(filters.sort);
  const [min, setMin] = useState(filters.min);
  const [max, setMax] = useState(filters.max);

  const filteredOrders = useMemo(() => {
    const search = q.trim().toLowerCase();
    const hasSearch = search.length > 0;
    const minAmount = Number(min || '0');
    const maxAmount = Number(max || '0');
    const minIsValid = Number.isFinite(minAmount) && min !== '';
    const maxIsValid = Number.isFinite(maxAmount) && max !== '';

    const results = orders.filter((order) => {
      const orderDate = order.processedAt ? new Date(order.processedAt).getTime() : 0;
      const total = Number(order.totalPrice.amount || '0');
      const trackingRef = (orderTrackingRefs[order.id] || '').toLowerCase();
      const confirmation = String(order.confirmationNumber || '').toLowerCase();
      const numberRef = `#${String(order.number || '').toLowerCase()}`;
      const lineItems = ((order as any).lineItems?.nodes || []) as Array<{ title?: string }>;
      const matchesProduct = lineItems.some((line) => String(line.title || '').toLowerCase().includes(search));

      const matchesSearch = !hasSearch
        ? true
        : trackingRef.includes(search) ||
        confirmation.includes(search) ||
        numberRef.includes(search) ||
        String(order.number || '').toLowerCase().includes(search) ||
        matchesProduct;

      if (!matchesSearch) return false;
      if (minIsValid && total < minAmount) return false;
      if (maxIsValid && total > maxAmount) return false;
      return true;
    });

    results.sort((a, b) => {
      const aDate = a.processedAt ? new Date(a.processedAt).getTime() : 0;
      const bDate = b.processedAt ? new Date(b.processedAt).getTime() : 0;
      const aAmount = Number(a.totalPrice.amount || '0');
      const bAmount = Number(b.totalPrice.amount || '0');

      switch (sort) {
        case 'fecha_asc':
          return aDate - bDate;
        case 'monto_asc':
          return aAmount - bAmount;
        case 'monto_desc':
          return bAmount - aAmount;
        case 'fecha_desc':
        default:
          return bDate - aDate;
      }
    });

    return results;
  }, [orders, q, sort, min, max, orderTrackingRefs]);

  const totalVisibleAmount = filteredOrders.reduce((acc, order) => acc + Number(order.totalPrice.amount || '0'), 0);
  const currencyCode = filteredOrders[0]?.totalPrice.currencyCode || orders[0]?.totalPrice.currencyCode || 'MXN';

  return (
    <AccountSectionLayout
      title="Pedidos"
      subtitle="Consulta, filtra y abre el detalle de tus pedidos."
      actions={
        <>
          <TagChip label={`${filteredOrders.length} resultados`} />
          <TagChip label={formatCurrency(totalVisibleAmount, currencyCode)} />
        </>
      }
    >
      <form method="get" className="rounded-xl border border-dark/10 bg-light p-4">
        <fieldset className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Input
              type="search"
              name="q"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Buscar por ord_, #pedido, confirmación o producto"
            />
          </div>




          <Input
            type="number"
            step="0.01"
            min="0"
            name="min"
            value={min}
            onChange={(event) => setMin(event.target.value)}
            placeholder="MXN mínimo"
            className="h-10 lg:col-span-2"
          />

          <Input
            type="number"
            step="0.01"
            min="0"
            name="max"
            value={max}
            onChange={(event) => setMax(event.target.value)}
            placeholder="MXN máximo"
            className="h-10 lg:col-span-2"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="default" className="h-10 px-4 flex items-center bg-light border border-dark rounded-md text-xs font-bold uppercase lg:col-span-3">
                Orden: {sortLabel(sort)}
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[230px]">
              <DropdownMenuItem onSelect={() => setSort('fecha_desc')}>Fecha: reciente → antigua</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSort('fecha_asc')}>Fecha: antigua → reciente</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSort('monto_desc')}>Monto: alto → bajo</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSort('monto_asc')}>Monto: bajo → alto</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </fieldset>

        <input type="hidden" name="sort" value={sort} />

        <div className="mt-3 flex flex-wrap items-center gap-2">

          <Button type="submit" variant="action" size="sm">
            Aplicar filtros
          </Button>
          <Button asChild type="button" variant="secondary" size="sm">
            <Link to="/account/orders">Limpiar</Link>
          </Button>
        </div>
      </form>

      <section className="mt-4 space-y-3" aria-live="polite">
        {filteredOrders.length === 0 ? (
          <div className="rounded-xl border border-dark/10 bg-light p-5">
            <p className="text-sm font-semibold text-dark">No encontramos pedidos con esos filtros.</p>
            <Link to="/account/orders" className="mt-2 inline-flex text-sm font-extrabold uppercase text-primary">
              Limpiar filtros
            </Link>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} trackingReference={orderTrackingRefs[order.id]} />
          ))
        )}
      </section>
    </AccountSectionLayout>
  );
}

function OrderCard({ order, trackingReference }: { order: OrderItemFragment; trackingReference?: string }) {
  const fulfillmentStatus = order.cancelledAt
    ? { label: 'Pedido cancelado' }
    : normalizeFulfillmentStatus(String(order.fulfillmentStatus || 'UNFULFILLED'));
  const financialStatus = normalizeFinancialStatus(order.financialStatus ? String(order.financialStatus) : '');
  const processedDate = order.processedAt
    ? new Date(order.processedAt).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    : '';

  const orderUrl = `/account/orders/${encodeURIComponent(btoa(order.id))}`;
  const lineItems = ((order as any).lineItems?.nodes || []) as Array<{
    title?: string;
    quantity?: number;
    image?: { url?: string; altText?: string | null } | null;
  }>;
  const firstLine = lineItems[0];
  const itemsCount = lineItems.reduce((acc, line) => acc + Number(line.quantity || 0), 0) || 1;

  return (
    <Link
      to={orderUrl}
      className="block rounded-2xl border border-dark/10 bg-white p-4 text-dark transition-colors hover:border-primary/70"
    >
      <article className="flex flex-wrap items-center gap-3 md:gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-dark/10 bg-light">
          {firstLine?.image?.url ? (
            <Image
              src={firstLine.image.url}
              alt={firstLine.image.altText || firstLine.title || `Pedido #${order.number}`}
              width={120}
              height={120}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase text-tgray">
              Sin imagen
            </div>
          )}
        </div>

        <div className="min-w-[140px] flex-1">
          <p className="text-lg font-extrabold text-dark">#{order.number}</p>
          <p className="text-sm text-dark/70">
            {itemsCount} artículo{itemsCount > 1 ? 's' : ''}
          </p>
          {trackingReference ? (
            <p className="text-[11px] font-semibold uppercase tracking-tight text-dark/60">{trackingReference}</p>
          ) : null}
        </div>

        <div className="min-w-[140px]">
          <p className="text-base font-bold text-dark">{fulfillmentStatus.label}</p>
          <p className="text-sm text-dark/70">{processedDate}</p>
          <p className="text-[11px] font-semibold uppercase tracking-tight text-dark/60">{financialStatus.label}</p>
        </div>

        <div className="ml-auto min-w-[150px] text-right">
          <p className="text-lg font-extrabold text-dark">
            <Money data={order.totalPrice} />
          </p>
          <p className="mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-dark/80">
            {financialStatus.badge}
          </p>
        </div>
      </article>
    </Link>
  );
}

function normalizeFulfillmentStatus(raw: string) {
  const key = raw.toUpperCase();
  const map: Record<string, { label: string }> = {
    UNFULFILLED: { label: 'Sin preparar' },
    PARTIALLY_FULFILLED: { label: 'Preparación parcial' },
    FULFILLED: { label: 'Preparado' },
    IN_PROGRESS: { label: 'En preparación' },
    ON_HOLD: { label: 'En pausa' },
  };
  return map[key] || { label: key.replace(/_/g, ' ').toLowerCase() };
}

function normalizeFinancialStatus(raw: string) {
  const key = raw.toUpperCase();
  const map: Record<string, { label: string; badge: string }> = {
    PENDING: { label: 'Pago pendiente', badge: 'Pendiente' },
    AUTHORIZED: { label: 'Pago autorizado', badge: 'Autorizado' },
    PAID: { label: 'Pagado', badge: 'Pagado' },
    PARTIALLY_PAID: { label: 'Pago parcial', badge: 'Parcial' },
    PARTIALLY_REFUNDED: { label: 'Reembolso parcial', badge: 'Reembolso parcial' },
    REFUNDED: { label: 'Reembolsado', badge: 'Reembolsado' },
    VOIDED: { label: 'Anulado', badge: 'Anulado' },
  };
  if (!key) return { label: 'Sin información de pago', badge: 'Sin dato' };
  return map[key] || { label: key.replace(/_/g, ' ').toLowerCase(), badge: 'Actualizado' };
}

function normalizeSort(value: string): OrderSort {
  if (value === 'fecha_asc' || value === 'monto_desc' || value === 'monto_asc') return value;
  return 'fecha_desc';
}

function sortLabel(sort: OrderSort) {
  switch (sort) {
    case 'fecha_asc':
      return 'Fecha: antigua → reciente';
    case 'monto_desc':
      return 'Monto: alto → bajo';
    case 'monto_asc':
      return 'Monto: bajo → alto';
    case 'fecha_desc':
    default:
      return 'Fecha: reciente → antigua';
  }
}

function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currencyCode || 'MXN',
    maximumFractionDigits: 2,
  }).format(amount);
}
