import type {ProductFragment, ProductVariantFragment} from 'storefrontapi.generated';
import {Image} from '@shopify/hydrogen';

export function ProductImage({
  image,
}: {
  image: ProductVariantFragment['image'] | ProductFragment['featuredImage'];
}) {
  if (!image) {
    return (
      <div className="aspect-square w-full overflow-hidden rounded-lg border border-dark/10 bg-lightgray" />
    );
  }
  return (
    <div className="aspect-square w-full overflow-hidden rounded-lg border border-dark/10 bg-lightgray">
      <Image
        alt={image.altText || 'Imagen del producto'}
        aspectRatio="1/1"
        data={image}
        key={image.id}
        sizes="(min-width: 45em) 50vw, 100vw"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
