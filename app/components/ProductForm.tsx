import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { type MappedProductOptions } from '@shopify/hydrogen';
import type {
  Maybe,
  ProductOptionValueSwatch,
} from '@shopify/hydrogen/storefront-api-types';
import { AddToCartButton } from './AddToCartButton';
import { useAside } from './Aside';
import type { ProductFragment } from 'storefrontapi.generated';
import { cn, focusStyle } from '~/lib/utils';
import { Minus, Plus, X } from 'lucide-react';

const PRODUCTS_REQUIRING_NAME = new Set([
  'maestra-cool-mc-06',
  'maestra-cool-mc-07',
  'maestra-cool-mc-10',
  'maestra-cool-mc-16',
  'maestra-cool-mc-24',
]);

export function ProductForm({
  productOptions,
  selectedVariant,
  productHandle,
}: {
  productOptions: MappedProductOptions[];
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
  productHandle: string;
}) {
  const navigate = useNavigate();
  const { open } = useAside();
  const [quantity, setQuantity] = useState(1);
  const [personalizedNames, setPersonalizedNames] = useState('');
  const [orderDetails, setOrderDetails] = useState('');
  const isNewCatalogProduct = productHandle.startsWith('maestra-cool-mc-');
  const requiresName = PRODUCTS_REQUIRING_NAME.has(productHandle);
  const attributes = [
    ...(personalizedNames.trim() ? [{key: 'Nombre(s) a imprimir', value: personalizedNames.trim()}] : []),
    ...(orderDetails.trim() ? [{key: 'Color, diseño o instrucciones', value: orderDetails.trim()}] : []),
  ];

  const increment = () => setQuantity((q) => Math.min(q + 1, 100));
  const decrement = () => setQuantity((q) => Math.max(q - 1, 1));

  return (
    <div className="flex flex-col gap-6">
      {productOptions.map((option) => {
        // If there is only a single value in the option values, don't display the option
        if (option.optionValues.length === 1) return null;

        return (
          <div key={option.name} className="flex flex-col gap-3">
            <h3 className="text-xs font-extrabold uppercase tracking-tight text-tgray">
              {option.name}
            </h3>

            <div className="flex flex-wrap gap-2">
              {option.optionValues.map((value) => {
                const {
                  name,
                  handle,
                  variantUriQuery,
                  selected,
                  available,
                  exists,
                  isDifferentProduct,
                  swatch,
                } = value;

                if (isDifferentProduct) {
                  return (
                    <Link
                      className={cn(
                        'inline-flex items-center gap-2 rounded-md border border-dark/15 bg-light px-3 py-2 text-sm font-semibold text-dark transition-colors hover:border-primary',
                        selected && 'border-primary bg-primary text-light',
                        !available && 'opacity-60',
                        focusStyle({ theme: 'action' })
                      )}
                      key={option.name + name}
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={`/tienda/p/${handle}?${variantUriQuery}`}
                      aria-current={selected ? 'true' : undefined}
                    >
                      <ProductOptionSwatch swatch={swatch} name={name} />
                    </Link>
                  );
                } else {
                  return (
                    <button
                      type="button"
                      className={cn(
                        'inline-flex items-center gap-2 rounded-md border border-dark/15 bg-light px-3 py-2 text-sm font-semibold text-dark transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50',
                        selected && 'border-primary bg-primary text-light',
                        !available && 'opacity-60',
                        focusStyle({ theme: 'action' })
                      )}
                      key={option.name + name}
                      disabled={!exists}
                      onClick={() => {
                        if (!selected) {
                          void navigate(`?${variantUriQuery}`, {
                            replace: true,
                            preventScrollReset: true,
                          });
                        }
                      }}
                    >
                      <ProductOptionSwatch swatch={swatch} name={name} />
                    </button>
                  );
                }
              })}
            </div>
          </div>
        );
      })}

      {isNewCatalogProduct && (
        <div className="space-y-4 border-t border-dark/10 pt-6">
          {requiresName && (
            <div className="space-y-2">
              <label htmlFor="personalized-names" className="block text-sm font-bold text-dark">
                Nombre(s) a imprimir <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="personalized-names"
                value={personalizedNames}
                onChange={(event) => setPersonalizedNames(event.target.value)}
                maxLength={255}
                required
                rows={2}
                placeholder="Si compras varias piezas, indica el nombre de cada una."
                className="w-full rounded-md border border-dark/20 bg-white p-3 text-sm text-dark"
              />
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="order-details" className="block text-sm font-bold text-dark">
              Color, diseño o instrucciones <span className="font-normal">(opcional)</span>
            </label>
            <textarea
              id="order-details"
              value={orderDetails}
              onChange={(event) => setOrderDetails(event.target.value)}
              maxLength={255}
              rows={2}
              placeholder="Indica los detalles de cada pieza si compras más de una."
              className="w-full rounded-md border border-dark/20 bg-white p-3 text-sm text-dark"
            />
          </div>
        </div>
      )}

      {/* Legacy Quantity Selector */}
      <div className="flex flex-col w-full border-t border-dark/10 pt-6">
        <div className="flex items-center justify-between border-b border-dark/10 pb-4">
          <div className="text-sm font-extrabold uppercase tracking-tight text-dark">
            Cantidad y precio:
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-dark/15 rounded-md bg-white overflow-hidden h-10 px-2 gap-1">
              <button
                type="button"
                onClick={decrement}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                aria-label="Disminuir cantidad"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-8 text-center bg-transparent border-none focus:ring-0 font-bold text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={increment}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                aria-label="Aumentar cantidad"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <X className="h-4 w-4 text-tgray" />
            <div className="text-xl font-extrabold text-dark">
              {selectedVariant?.price ? (
                `$${parseFloat(selectedVariant.price.amount).toFixed(2)}`
              ) : (
                'Gratis'
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between py-4 text-2xl font-extrabold">
          <p className="uppercase tracking-tight">Total</p>
          <p className="text-primary tracking-tight">
            {selectedVariant?.price ? (
              `$${(parseFloat(selectedVariant.price.amount) * quantity).toFixed(2)}`
            ) : (
              'Gratis'
            )}
          </p>
        </div>
      </div>

      <AddToCartButton
        disabled={!selectedVariant || !selectedVariant.availableForSale || (requiresName && !personalizedNames.trim())}
        onClick={() => {
          open('cart');
        }}
        lines={
          selectedVariant
            ? [
              {
                merchandiseId: selectedVariant.id,
                quantity,
                attributes,
                selectedVariant,
              },
            ]
            : []
        }
      >
        {selectedVariant?.availableForSale
          ? requiresName && !personalizedNames.trim() ? 'Indica el nombre para continuar' : 'Agregar al carrito'
          : 'Agotado'}
      </AddToCartButton>
    </div>
  );
}

function ProductOptionSwatch({
  swatch,
  name,
}: {
  swatch?: Maybe<ProductOptionValueSwatch> | undefined;
  name: string;
}) {
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  if (!image && !color) return <span>{name}</span>;

  return (
    <>
      <span
        aria-hidden
        className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-md border border-dark/15"
        style={{ backgroundColor: color || 'transparent' }}
      >
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : null}
      </span>
      <span>{name}</span>
    </>
  );
}
