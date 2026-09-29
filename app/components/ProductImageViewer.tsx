import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, X } from 'lucide-react';

type ViewerImage = {
  url: string;
  altText?: string | null;
};

type DragStart = { x: number; y: number; offsetX: number; offsetY: number };

export function ProductImageViewer({
  images,
  initialIndex,
  title,
  onClose,
}: {
  images: ViewerImage[];
  initialIndex: number;
  title: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dragStart = useRef<DragStart | null>(null);
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const close = () => dialogRef.current?.close();

  const changeImage = (direction: -1 | 1) => {
    setIndex((current) => (current + direction + images.length) % images.length);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    dragStart.current = null;
  };

  const changeZoom = (difference: number) => {
    const next = Math.min(4, Math.max(1, Math.round((zoom + difference) * 4) / 4));
    setZoom(next);
    if (next === 1) setOffset({ x: 0, y: 0 });
  };

  const resetZoom = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'ArrowLeft' && images.length > 1) {
      event.preventDefault();
      changeImage(-1);
    } else if (event.key === 'ArrowRight' && images.length > 1) {
      event.preventDefault();
      changeImage(1);
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      changeZoom(0.25);
    } else if (event.key === '-') {
      event.preventDefault();
      changeZoom(-0.25);
    } else if (event.key === '0') {
      event.preventDefault();
      resetZoom();
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLImageElement>) => {
    if (zoom === 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLImageElement>) => {
    if (!dragStart.current) return;
    setOffset({
      x: dragStart.current.offsetX + event.clientX - dragStart.current.x,
      y: dragStart.current.offsetY + event.clientY - dragStart.current.y,
    });
  };

  const image = images[index];

  return (
    <dialog
      ref={dialogRef}
      aria-label={`Imágenes de ${title}`}
      onClose={onClose}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[100] m-0 h-[100dvh] max-h-none w-screen max-w-none border-0 bg-dark p-0 text-light backdrop:bg-black/85"
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-b border-white/15 bg-dark/90 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold uppercase tracking-tight sm:text-lg">{title}</p>
            <p aria-live="polite" className="text-xs font-semibold text-white/60">
              Imagen {index + 1} de {images.length}
            </p>
          </div>
          <button type="button" onClick={close} aria-label="Cerrar visor" className="rounded-md border border-white/30 p-2 transition-colors hover:bg-white hover:text-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-12 py-4 sm:px-20">
          <img
            key={image.url}
            src={image.url}
            alt={image.altText || title}
            draggable={false}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={() => { dragStart.current = null; }}
            onPointerCancel={() => { dragStart.current = null; }}
            className="max-h-full max-w-full select-none object-contain"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              touchAction: zoom > 1 ? 'none' : 'auto',
              cursor: zoom > 1 ? 'grab' : 'default',
            }}
          />
          {images.length > 1 && (
            <>
              <button type="button" onClick={() => changeImage(-1)} aria-label="Imagen anterior" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-dark/80 p-2 transition-colors hover:bg-white hover:text-dark focus-visible:outline-2 focus-visible:outline-white sm:left-6">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button type="button" onClick={() => changeImage(1)} aria-label="Imagen siguiente" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-dark/80 p-2 transition-colors hover:bg-white hover:text-dark focus-visible:outline-2 focus-visible:outline-white sm:right-6">
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-center gap-2 border-t border-white/15 bg-dark/90 px-4 py-3">
          <button type="button" onClick={() => changeZoom(-0.25)} disabled={zoom === 1} aria-label="Reducir imagen" className="rounded-md border border-white/30 p-2 transition-colors hover:bg-white hover:text-dark disabled:cursor-not-allowed disabled:opacity-40">
            <Minus className="h-5 w-5" />
          </button>
          <span aria-live="polite" className="min-w-16 text-center text-sm font-bold">{Math.round(zoom * 100)} %</span>
          <button type="button" onClick={() => changeZoom(0.25)} disabled={zoom === 4} aria-label="Ampliar imagen" className="rounded-md border border-white/30 p-2 transition-colors hover:bg-white hover:text-dark disabled:cursor-not-allowed disabled:opacity-40">
            <Plus className="h-5 w-5" />
          </button>
          <button type="button" onClick={resetZoom} disabled={zoom === 1} aria-label="Restablecer zoom" className="ml-2 flex items-center gap-2 rounded-md border border-white/30 px-3 py-2 text-xs font-bold uppercase transition-colors hover:bg-white hover:text-dark disabled:cursor-not-allowed disabled:opacity-40">
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Restablecer</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
