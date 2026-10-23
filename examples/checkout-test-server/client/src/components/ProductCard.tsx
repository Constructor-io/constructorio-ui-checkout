import { useNavigate } from "react-router-dom";

import { ProductCard as LibProductCard } from "@constructor-io/constructorio-ui-components";

import type { StoreProduct } from "../lib/search";

interface ProductCardProps {
  product: StoreProduct;
  linkTo?: string;
  onAdd?: (product: StoreProduct) => void;
  addLabel?: string;
}

export default function ProductCard({
  product,
  linkTo,
  onAdd,
  addLabel = "Add to cart",
}: ProductCardProps) {
  const nav = useNavigate();

  const libProduct = {
    id: product.id,
    name: product.name,
    imageUrl: product.imageUrl,
    price: product.price,
    description: product.description,
  };

  return (
    <LibProductCard
      product={libProduct}
      priceCurrency="USD"
      addToCartText={addLabel}
      data-testid={`product-${product.id}`}
      onProductClick={linkTo ? () => nav(linkTo) : undefined}
      onAddToCart={onAdd ? (_e, _p) => onAdd(product) : undefined}
      style={linkTo ? { cursor: "pointer" } : undefined}
    />
  );
}
