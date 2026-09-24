import type { CartLineUpdateInput } from '@shopify/hydrogen/storefront-api-types';
import type { CartLayout, LineItemChildrenMap } from '~/components/CartMain';
import { CartForm, Image, type OptimisticCartLine } from '@shopify/hydrogen';
import { useVariantUrl } from '~/lib/variants';
import { Link } from 'react-router';
import { ProductPrice } from './ProductPrice';
import { useAside } from './Aside';
import { cn, focusStyle } from '~/lib/utils';
import type {
  CartApiQueryFragment,
  CartLineFragment,
} from 'storefrontapi.generated';

export type CartLine = OptimisticCartLine<CartApiQueryFragment>;

/**
 * A single line item in the cart. It displays the product image, title, price.
 * It also provides controls to update the quantity or remove the line item.
 * If the line is a parent line that has child components (like warranties or gift wrapping), they are
 * rendered nested below the parent line.
 */
export function CartLineItem({
  layout,
  line,
  childrenMap,
}: {
  layout: CartLayout;
  line: CartLine;
  childrenMap: LineItemChildrenMap;
}) {
  const { id, merchandise, cost, attributes } = line;
  const { product, title, image, selectedOptions } = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const { close } = useAside();
  const lineItemChildren = childrenMap[id];
  const childrenLabelId = `cart-line-children-${id}`;

  return (
    <li key={id} className="border-b border-dark/10 py-6 last:border-0">
      <div className="flex items-start gap-4">
        {image && (
          <Image
            alt={title}
            aspectRatio="1/1"
            data={image}
            height={80}
            loading="lazy"
            width={80}
            className="rounded-none object-contain mix-blend-multiply"
          />
        )}

        <div className="flex-1 flex flex-col gap-2">
          <div className="flex justify-between items-start gap-2">
            <div className="flex flex-col">
              <Link
                prefetch="intent"
                to={lineItemUrl}
                onClick={() => {
                  if (layout === 'aside') {
                    close();
                  }
                }}
                className={cn("rounded", focusStyle({ theme: 'action' }))}
              >
                <p className="text-[13px] font-extrabold uppercase tracking-tight text-dark leading-tight">
                  {product.title}
                </p>
              </Link>
              <p className="text-[10px] font-bold uppercase text-tgray tracking-tight mt-0.5">
                {selectedOptions
                  .filter((opt) => opt.value !== 'Default Title')
                  .map((opt) => opt.value)
                  .join(' / ')}
              </p>
              {attributes?.filter((attribute) => attribute.value).map((attribute) => (
                <p key={attribute.key} className="text-xs text-tgray">
                  <span className="font-semibold">{attribute.key}:</span> {attribute.value}
                </p>
              ))}
            </div>

            <div className="flex flex-col items-end shrink-0">
              <CartLineQuantity line={line} />
              <div className="mt-2 text-[15px] font-extrabold text-dark tracking-tight">
                <ProductPrice price={line?.cost?.totalAmount} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {lineItemChildren ? (
        <div className="mt-3 border-t border-dark/10 pt-3 pl-10">
          <p id={childrenLabelId} className="sr-only">
            Line items with {product.title}
          </p>
          <ul aria-labelledby={childrenLabelId} className="flex flex-col gap-3">
            {lineItemChildren.map((childLine) => (
              <CartLineItem
                childrenMap={childrenMap}
                key={childLine.id}
                line={childLine}
                layout={layout}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Provides the controls to update the quantity of a line item in the cart.
 * These controls are disabled when the line item is new, and the server
 * hasn't yet responded that it was successfully added to the cart.
 */
function CartLineQuantity({ line }: { line: CartLine }) {
  if (!line || typeof line?.quantity === 'undefined') return null;
  const { id: lineId, quantity, isOptimistic } = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  return (
    <div className="flex items-center bg-gray-100 rounded overflow-hidden h-7 border border-dark/5">
      {quantity > 1 ? (
        <CartLineUpdateButton lines={[{ id: lineId, quantity: prevQuantity }]}>
          <button
            aria-label="Disminuir cantidad"
            disabled={!!isOptimistic}
            name="decrease-quantity"
            value={prevQuantity}
            className="flex h-full w-7 items-center justify-center bg-[#D9D9D9] text-dark hover:bg-dark hover:text-light disabled:opacity-50 transition-colors text-xs font-bold"
          >
            <span>&#8722; </span>
          </button>
        </CartLineUpdateButton>
      ) : (
        <CartLineRemoveButton lineIds={[lineId]} disabled={!!isOptimistic}>
          <button
            aria-label="Quitar del carrito"
            disabled={!!isOptimistic}
            className="flex h-full w-7 items-center justify-center bg-[#D9D9D9] text-dark hover:bg-dark hover:text-light disabled:opacity-50 transition-colors text-xs font-bold"
          >
            <span>&#8722; </span>
          </button>
        </CartLineRemoveButton>
      )}

      <div className="px-2 text-[11px] font-extrabold text-dark min-w-[20px] text-center">
        {quantity}
      </div>

      <CartLineUpdateButton lines={[{ id: lineId, quantity: nextQuantity }]}>
        <button
          aria-label="Aumentar cantidad"
          name="increase-quantity"
          value={nextQuantity}
          disabled={!!isOptimistic}
          className="flex h-full w-7 items-center justify-center bg-primary text-light hover:bg-dark transition-colors text-xs font-bold"
        >
          <span>&#43;</span>
        </button>
      </CartLineUpdateButton>
    </div>
  );
}

/**
 * A button that removes a line item from the cart. It is disabled
 * when the line item is new, and the server hasn't yet responded
 * that it was successfully added to the cart.
 */
function CartLineRemoveButton({
  lineIds,
  disabled,
  children,
}: {
  lineIds: string[];
  disabled: boolean;
  children?: React.ReactNode;
}) {
  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{ lineIds }}
    >
      {children}
    </CartForm>
  );
}

function CartLineUpdateButton({
  children,
  lines,
}: {
  children: React.ReactNode;
  lines: CartLineUpdateInput[];
}) {
  const lineIds = lines.map((line) => line.id);

  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{ lines }}
    >
      {children}
    </CartForm>
  );
}

/**
 * Returns a unique key for the update action. This is used to make sure actions modifying the same line
 * items are not run concurrently, but cancel each other. For example, if the user clicks "Increase quantity"
 * and "Decrease quantity" in rapid succession, the actions will cancel each other and only the last one will run.
 * @param lineIds - line ids affected by the update
 * @returns
 */
function getUpdateKey(lineIds: string[]) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
}
