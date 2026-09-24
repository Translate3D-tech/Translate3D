import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Image, Money } from '@shopify/hydrogen';
import type { MoneyV2 } from '@shopify/hydrogen/storefront-api-types';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '~/components/ui/carousel';
import { Button } from '~/components/ui/button';
import { cn, focusStyle } from '~/lib/utils';
import { TagChip } from '~/components/landing/TagChip';
import { ProductItem } from '~/components/ProductItem';

export type BestSellerProduct = {
  id: string;
  availableForSale?: boolean;
  title: string;
  handle: string;
  tags: string[];
  collections?: {
    nodes: Array<{
      handle: string;
      title?: string;
    }>;
  };
  featuredImage?: {
    id?: string | null;
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  priceRange: {
    minVariantPrice: MoneyV2;
  };
};

type FilterKey = 'descuento' | 'nuevo' | 'disponible' | null;

const PREFERRED_COLLECTION_HANDLES = new Set([
  'coleccion-maestr-cool',
  'modelos-3d',
  'filamentos',
  'resinas',
  'refacciones',
]);

function resolveCollectionHandle(product: BestSellerProduct) {
  const handles = (product.collections?.nodes ?? [])
    .map((collection) => collection.handle)
    .filter(Boolean);

  const preferred = handles.find((handle) => PREFERRED_COLLECTION_HANDLES.has(handle));
  if (preferred) return preferred;

  const fallback = handles.find((handle) => handle !== 'frontpage' && handle !== 'all');
  return fallback;
}

export function BestSellers({ products }: { products: BestSellerProduct[] }) {
  const [filter, setFilter] = useState<FilterKey>(null);

  const filtered = useMemo(() => {
    if (!filter) return products;
    const tag =
      filter === 'nuevo'
        ? 'Nuevo'
        : filter === 'disponible'
          ? 'En stock'
          : 'Descuento';
    return products.filter((p) => p.tags?.includes(tag));
  }, [filter, products]);

  return (
    <section className="flex w-full flex-col min-h-fit bg-light text-dark items-center justify-between gap-20 py-20">
      <div className="flex flex-col w-full gap-2.5 px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8 flex-wrap">
          <h2 className="text-[64px] font-extrabold uppercase leading-[100%] tracking-tight min-w-fit">
            Productos m&aacute;s vendidos
          </h2>
          <div className="flex flex-wrap gap-2 min-w-fit lg:ml-0">
            <FilterButton
              active={filter === 'descuento'}
              onClick={() => setFilter((f) => (f === 'descuento' ? null : 'descuento'))}
            >
              Descuento
            </FilterButton>
            <FilterButton active={filter === 'nuevo'} onClick={() => setFilter((f) => (f === 'nuevo' ? null : 'nuevo'))}>
              Nuevo
            </FilterButton>
            <FilterButton
              active={filter === 'disponible'}
              onClick={() => setFilter((f) => (f === 'disponible' ? null : 'disponible'))}
            >
              EN STOCK
            </FilterButton>
          </div>
        </div>

        {filtered.length > 0 ? (
          <Carousel className="border-t border-dark" opts={{ align: 'start', loop: false }}>
            <CarouselContent className="-ml-0">
              {filtered.map((product) => (
                <CarouselItem
                  key={product.id}
                  className="basis-full pl-0 border-r border-dark last:border-r-0 md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <ProductItem
                    product={product as any}
                    collectionHandle={resolveCollectionHandle(product)}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="mt-4 flex justify-end gap-2">
              <CarouselPrevious />
              <CarouselNext />
            </div>
          </Carousel>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[545px] border-t border-dark gap-6 text-center w-full">
            <h3 className="text-[32px] md:text-[48px] font-extrabold uppercase tracking-tight">
              Sin resultados
            </h3>
            <p className="text-tgray max-w-md">
              No se encontraron productos en la categoría de <span className="font-bold text-dark italic">&ldquo;{filter}&rdquo;</span> en este momento.
            </p>
            <Button
              variant="action"
              onClick={() => setFilter(null)}
              className="mt-2"
            >
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function FilterButton({
  active,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { active: boolean }) {
  return (
    <Button
      type="button"
      variant={active ? 'action' : 'secondary'}
      size="sm"
      className={cn(className)}
      {...props}
    />
  );
}
