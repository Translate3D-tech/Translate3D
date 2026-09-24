import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { LogoIcon } from '~/components/LogoIcon';

export function InfiniteText() {
  const [width, setWidth] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (carouselRef.current) {
        // The content is duplicated, so we measure half.
        setWidth(carouselRef.current.scrollWidth / 2);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const content = (
    <div className="mx-4 lg:mx-8 flex items-center gap-4">
      <div className="flex size-24 lg:size-32 items-center justify-center rounded-md bg-light">
        <LogoIcon className="w-20 lg:w-28" />
      </div>
      <h1 className="text-[64px] lg:text-[96px] font-extrabold uppercase whitespace-nowrap tracking-tight text-dark">
        &iquest;Qu&eacute; hacemos?
      </h1>
    </div>
  );

  return (
    <div className="w-full overflow-hidden bg-light text-dark">
      <div
        ref={carouselRef}
        className="flex items-center"
        style={{
          width: width ? `${width * 2}px` : undefined,
          // Used by `.animate-landing-marquee` in global CSS.
          ['--marquee-duration' as any]: width ? `${width / 50}s` : '24s',
        } as CSSProperties}
      >
        <div className="flex animate-landing-marquee items-center">
          {content}
          {content}
          {content}
          {content}
        </div>
      </div>
    </div>
  );
}
