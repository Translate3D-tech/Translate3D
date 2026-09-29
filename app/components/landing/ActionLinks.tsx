import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '~/components/ui/button';
import { cn, focusStyle } from '~/lib/utils';

const links = [
  { to: '/servicios', label: 'Servicios' },
  { to: '/blog', label: 'Blog' },
  { to: '/tienda/impresiones', label: 'Nuestras impresiones' },
  { to: '/tienda/coleccion-maestr-cool', label: 'Colección Maestr@ Cool' },
];

export function ActionLinks() {
  return (
    <section className="flex w-full flex-col min-h-fit bg-light text-dark items-center justify-between gap-20 py-20">
      <div className="flex w-full flex-col gap-20 px-5">
        <p className="text-center text-[64px] lg:text-[96px] font-extrabold leading-[100%] tracking-tight uppercase">
          Dise&ntilde;ando el futuro,
          <br />
          una impresi&oacute;n a la vez
        </p>

        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-center">
          <div className="flex flex-col justify-between gap-2.5">
            <p className="min-w-full lg:min-w-[500px] lg:w-1/2 text-[16px] font-normal normal-case leading-[120%] text-dark">
              En Translate3D, la calidad es nuestra m&aacute;xima prioridad. Nos
              esforzamos por garantizar que cada producto y servicio cumpla con
              los m&aacute;s altos est&aacute;ndares.
            </p>
            <Button asChild variant="action" className="w-fit">
              <Link to="/servicios" prefetch="intent">
                Cotiza tus ideas <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="flex w-full lg:max-w-[720px] flex-col font-extrabold">
            {links.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                prefetch="intent"
                className={cn(
                  'group/link relative flex w-full items-center gap-20 border-t border-dark px-5 py-3 text-dark transition-colors duration-300 hover:text-light',
                  focusStyle({ theme: 'action', focusType: 'inner' })
                )}
              >
                <span className="relative z-[5] flex items-center gap-20">
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
                  <p className="text-[16px] font-normal leading-[120%] uppercase">
                    {l.label}
                  </p>
                </span>
                <span className="absolute inset-0 z-0 origin-bottom scale-y-0 bg-dark transition-transform duration-300 ease-out group-hover/link:scale-y-100 rounded" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
