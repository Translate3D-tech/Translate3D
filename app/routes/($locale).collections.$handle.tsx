import {redirect} from 'react-router';
import type {Route} from './+types/($locale).collections.$handle';

export async function loader({params, request}: Route.LoaderArgs) {
  const handle = params.handle;
  if (!handle) throw new Response('Colección no encontrada', {status: 404});

  const search = new URL(request.url).search;
  return redirect(`/tienda/${encodeURIComponent(handle)}${search}`, 301);
}

export default function CollectionRedirect() {
  return null;
}
