import type { HTMLAttributes } from 'react';

/** The artwork includes a wordmark below the symbol; compact placements show the symbol only. */
export function LogoIcon({ className = '', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden ${className}`}
      style={{ aspectRatio: '1122 / 1230' }}
      aria-hidden="true"
      {...props}
    >
      <img
        src="/logos/translate3d.png"
        alt=""
        className="absolute left-0 top-0 h-auto w-full max-w-none"
        decoding="async"
      />
    </span>
  );
}
