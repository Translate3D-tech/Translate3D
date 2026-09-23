import {redirect} from 'react-router';
import type {Route} from './+types/($locale).collections._index';

export async function loader({request}: Route.LoaderArgs) {
  return redirect(`/tienda${new URL(request.url).search}`, 301);
}

export default function CollectionsRedirect() {
  return null;
}
