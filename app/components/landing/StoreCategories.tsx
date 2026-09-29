import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { cn, focusStyle } from '~/lib/utils';

export type StoreCategory = {
  title: string;
  to: string;
  imageSrc: string;
  rounded?: 'left' | 'right' | 'none';
};

export function StoreCategories({ categories }: { categories: StoreCategory[] }) {
  const [hoveredTitle, setHoveredTitle] = useState<string | null>(null);

  return (
    <section className="flex w-full flex-col items-center justify-between gap-20 bg-light py-20 text-dark">
      <div className="flex w-full flex-col px-5">
        <h2 className="text-[64px] font-extrabold uppercase leading-[100%] tracking-tight">
          Visita nuestra tienda
        </h2>

        <div className="mt-8 flex flex-col gap-6 text-2xl font-extrabold md:h-[clamp(32rem,42vw,46rem)] md:flex-row md:gap-0 md:[container-type:inline-size]">
          {categories.map((category) => (
            <CategoryCard
              key={category.to}
              category={category}
              hasSibling={categories.length > 1}
              isHovered={hoveredTitle === category.title}
              isDimmed={hoveredTitle !== null && hoveredTitle !== category.title}
              onHover={() => setHoveredTitle(category.title)}
              onLeave={() => setHoveredTitle(null)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryCard({
  category,
  hasSibling,
  isHovered,
  isDimmed,
  onHover,
  onLeave
}: {
  category: StoreCategory;
  hasSibling: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  return (
    <div
      className={cn(
        'relative flex h-[min(85vw,30rem)] min-h-0 min-w-0 cursor-pointer flex-col gap-2.5 overflow-hidden md:h-full md:transition-[flex-grow] md:duration-300 md:ease-out',
        isHovered ? 'md:flex-[2]' : 'md:flex-1',
      )}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <Link
        to={category.to}
        prefetch="intent"
        className={cn(
          "flex h-full w-full flex-col gap-2.5",
          focusStyle({ theme: 'dark', focusType: 'inner' })
        )}
      >
        <div
          className={cn('relative min-h-0 flex-1 overflow-hidden transition-[border-radius] duration-200', {
            'rounded-l-lg': category.rounded === 'left',
            'rounded-r-lg': category.rounded === 'right',
          })}
        >
          <img
            src={category.imageSrc}
            alt={category.title}
            className={cn(
              'absolute left-1/2 top-0 h-full w-full max-w-none -translate-x-1/2 object-cover',
              hasSibling ? 'md:w-[66.6667cqw]' : 'md:w-[100cqw]',
            )}
            loading="lazy"
          />
          <div className={cn(
            "absolute inset-0 bg-black transition-opacity duration-300 pointer-events-none",
            isDimmed ? "opacity-40" : "opacity-0"
          )} />
        </div>

        <div className="flex h-20 shrink-0 items-center gap-2.5">
          <p className="min-w-0 line-clamp-2 tracking-tight uppercase text-xl md:text-[clamp(1rem,1.5vw,1.875rem)]">{category.title}</p>
          <ArrowRight className="h-6 w-6 shrink-0 transition-transform duration-200 group-hover/tile:translate-x-2" />
        </div>
      </Link>
    </div>
  );
}
