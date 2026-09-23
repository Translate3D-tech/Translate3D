import {data} from 'react-router';
import type {Route} from './+types/($locale).api.order-tracker';
import {findServiceQuoteRequestByOrderId} from '~/lib/serviceQuotes.server';
import {findAdminOrderByTrackingReference} from '~/lib/shopifyAdmin.server';
import {isValidOrderTrackingReference} from '~/lib/orderTracking.server';
import {TRACKING_REFERENCE_HELP} from '~/lib/trackingMessages';

type TrackerSuccessResponse =
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
    };

type TrackerErrorResponse = {
  ok: false;
  message: string;
};

type TrackerResponse = TrackerSuccessResponse | TrackerErrorResponse;

function normalizeReference(input: string) {
  return input.trim().replace(/\s+/g, '');
}

export async function loader() {
  return data<TrackerErrorResponse>(
    {ok: false, message: 'Usa POST para rastrear pedidos.'},
    {status: 405},
  );
}

export async function action({request, context}: Route.ActionArgs) {
  const formData = await request.formData();
  const rawReference = String(formData.get('reference') || '');
  const normalizedInput = normalizeReference(rawReference);
  const reference = normalizedInput.startsWith('ord_')
    ? normalizedInput
    : normalizedInput.toUpperCase().startsWith('ORD_')
      ? `ord_${normalizedInput.slice(4)}`
      : normalizedInput.toUpperCase();

  if (!reference || reference.length < 3) {
    return data<TrackerErrorResponse>(
      {ok: false, message: 'Ingresa un numero de pedido valido.'},
      {status: 400},
    );
  }

  const isQuoteReference = reference.startsWith('COT-');
  const isOrderReference = isValidOrderTrackingReference(reference);

  if (!isQuoteReference && !isOrderReference) {
    return data<TrackerErrorResponse>(
      {
        ok: false,
        message: TRACKING_REFERENCE_HELP,
      },
      {status: 400},
    );
  }

  if (isQuoteReference) {
    const quote = await findServiceQuoteRequestByOrderId(context.env, reference);
    if (!quote) {
      return data<TrackerErrorResponse>(
        {ok: false, message: `No encontramos el folio ${reference}.`},
        {status: 404},
      );
    }

    return data<TrackerResponse>({
      ok: true,
      kind: 'service_quote',
      reference,
      quote: {
        id: quote.id,
        orderId: quote.orderId,
        serviceMode: quote.serviceMode,
        status: quote.status,
        requestedAt: quote.requestedAt,
      },
    });
  }

  const order = await findAdminOrderByTrackingReference(context.env, reference);
  if (order) {
    return data<TrackerResponse>({
      ok: true,
      kind: 'shopify_order',
      reference,
      order,
    });
  }

  return data<TrackerErrorResponse>(
    {
      ok: false,
      message: `No encontramos resultados para ${reference}. Verifica el folio e intenta de nuevo.`,
    },
    {status: 404},
  );
}

export default function OrderTrackerApiRoute() {
  return null;
}
