import {
  data as remixData,
  Form,
  NavLink,
  Outlet,
  useLoaderData,
} from 'react-router';
import type { Route } from './+types/($locale).account';
import { CUSTOMER_DETAILS_QUERY } from '~/graphql/customer-account/CustomerDetailsQuery';
import { cn } from '~/lib/utils';
import { isAdminCustomer } from '~/lib/shopifyAdmin.server';

export function shouldRevalidate() {
  return true;
}

export async function loader({ context }: Route.LoaderArgs) {
  const { customerAccount } = context;
  const { data, errors } = await customerAccount.query(CUSTOMER_DETAILS_QUERY, {
    variables: {
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw new Error('Cliente no encontrado');
  }

  let isAdmin = false;
  try {
    isAdmin = await isAdminCustomer(context.env, data.customer.id);
  } catch (error) {
    console.error('No se pudo validar tag admin:', error);
  }

  return remixData(
    { customer: data.customer, isAdmin },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  );
}

export default function AccountLayout() {
  const { customer, isAdmin } = useLoaderData<typeof loader>();

  const heading = customer
    ? customer.firstName
      ? `Bienvenido, ${customer.firstName}`
      : `Bienvenido a tu cuenta.`
    : 'Mi cuenta';

  return (
    <section className="mx-auto w-full max-w-7xl px-5 pb-12 pt-24 font-manrope text-dark">
      <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold uppercase leading-[0.95] tracking-tight text-dark">
        {heading}
      </h1>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <AccountMenu isAdmin={isAdmin} />
      </div>

      <div className="mt-10">
        <Outlet context={{ customer }} />
      </div>
    </section>
  );
}

function AccountMenu({ isAdmin }: { isAdmin: boolean }) {
  return (
    <nav role="navigation">
      <div className="flex flex-wrap items-center gap-2">
        <AccountMenuLink to="/account/orders">Pedidos</AccountMenuLink>
        <AccountMenuLink to="/account/cotizaciones">Cotizaciones</AccountMenuLink>
        <AccountMenuLink to="/account/profile">Perfil</AccountMenuLink>
        {isAdmin ? <AccountMenuLink to="/admin">Admin panel</AccountMenuLink> : null}
        <Logout />
      </div>
    </nav>
  );
}

function AccountMenuLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      prefetch="intent"
      className={({ isActive, isPending }) =>
        cn(
          'inline-flex items-center rounded-md border border-dark/15 bg-light px-4 py-2 text-sm font-extrabold uppercase tracking-tight text-dark transition-colors',
          isActive && 'border-primary bg-primary/10 text-primary',
          isPending && 'opacity-60',
        )
      }
    >
      {String(children)}
    </NavLink>
  );
}

function Logout() {
  return (
    <Form className="account-logout" method="POST" action="/account/logout">
      <button
        type="submit"
        className="inline-flex items-center rounded-md border border-primary bg-primary px-4 py-2 text-sm font-extrabold uppercase tracking-tight text-light transition-colors hover:border-dark hover:bg-dark"
      >
        Cerrar sesi&oacute;n
      </button>
    </Form>
  );
}
