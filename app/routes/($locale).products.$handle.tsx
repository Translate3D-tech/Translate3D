import {redirect} from 'react-router';
import type {Route} from './+types/($locale).products.$handle';

export async function loader({params, request}: Route.LoaderArgs) {
  const handle = params.handle;
  if (!handle) throw new Response('Producto no encontrado', {status: 404});

  const search = new URL(request.url).search;
  return redirect(`/tienda/all/${encodeURIComponent(handle)}${search}`, 301);
}

export default function ProductRedirect() {
  return null;
}
