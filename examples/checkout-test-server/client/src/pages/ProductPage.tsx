import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";

import { CioPia } from "@constructor-io/constructorio-ui-pia";
import type {
  CheckoutTrigger,
  Item,
  CioPiaComponentOverrides,
} from "@constructor-io/constructorio-ui-pia";
import { Button } from "@constructor-io/constructorio-ui-components";
import type {
  ProductCardProps,
  Product,
} from "@constructor-io/constructorio-ui-components";

import { RecommendationsRail } from "../components/checkoutParts";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { CIO_API_KEY, fmtUsd } from "../lib/constants";
import { browseProducts, StoreProduct } from "../lib/search";
import BuyNowFlow from "../flows/BuyNowFlow";
import { useFlowBasePath } from "../flows/shared/basePath";

async function findProduct(id: string): Promise<StoreProduct | null> {
  const list = await browseProducts({ numResults: 24 });
  return list.find((p) => p.id === id) || list[0] || null;
}

const CHECKOUT_ENTRY: Record<string, string> = {
  "/full": "/full/checkout/recommendations",
  "/guest": "/guest/checkout/recommendations",
  "/resume": "/resume/checkout/recommendations",
  "/expiry": "/expiry/checkout/recommendations",
  "/hook-only": "/hook-only/checkout/recommendations",
  "/one-page": "/one-page/checkout",
  "/mixed": "/mixed/checkout/details",
};

export default function ProductPage() {
  const { id } = useParams();
  const base = useFlowBasePath();
  const nav = useNavigate();
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyNowOpen, setBuyNowOpen] = useState(false);
  const cart = useCart();
  const auth = useAuth();

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    findProduct(id)
      .then((p) => alive && setProduct(p))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  const addToCart = () => {
    if (!product) return;
    cart.add({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
    });
  };

  const startRoutedCheckout = () => {
    if (!product) return;
    if (!cart.items.some((i) => i.id === product.id)) addToCart();
    const target = CHECKOUT_ENTRY[base] ?? `${base}/checkout/recommendations`;
    nav(
      auth.user
        ? target
        : `${base}/login?redirect=${encodeURIComponent(target)}`,
    );
  };

  const openBuyNow = () => setBuyNowOpen(true);

  const [addedIds, setAddedIds] = useState<Record<string, true>>({});
  const clearTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(
    () => () => {
      Object.values(clearTimers.current).forEach(clearTimeout);
    },
    [],
  );

  const handlePiaAddToCart = useCallback(
    (item: Item, event: ReactMouseEvent) => {
      event.stopPropagation();
      event.preventDefault();

      const itemId = String(
        (item as unknown as { itemId?: unknown }).itemId ??
          (item as unknown as { id?: unknown }).id ??
          "",
      );
      if (!itemId) return;
      const rawPrice =
        (item as unknown as { price?: unknown }).price ??
        (item.data as unknown as { price?: unknown } | undefined)?.price;
      const price =
        typeof rawPrice === "number" ? rawPrice : Number(rawPrice) || 0;
      const rawImage =
        (item as unknown as { imageUrl?: unknown }).imageUrl ??
        (
          item.data as unknown as
            { image_url?: unknown; imageUrl?: unknown } | undefined
        )?.image_url ??
        (item.data as unknown as { imageUrl?: unknown } | undefined)?.imageUrl;
      const name = String(
        (item as unknown as { value?: unknown }).value ??
          (item as unknown as { itemName?: unknown }).itemName ??
          (item as unknown as { name?: unknown }).name ??
          "Product",
      );

      cart.add({
        id: itemId,
        name,
        price,
        imageUrl: typeof rawImage === "string" ? rawImage : undefined,
      });

      setAddedIds((prev) => ({ ...prev, [itemId]: true }));
      if (clearTimers.current[itemId])
        clearTimeout(clearTimers.current[itemId]);
      clearTimers.current[itemId] = setTimeout(() => {
        setAddedIds((prev) => {
          if (!prev[itemId]) return prev;
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
        delete clearTimers.current[itemId];
      }, 1200);
    },
    [cart],
  );

  const piaComponentOverrides = useMemo<CioPiaComponentOverrides>(
    () => ({
      carousel: {
        item: {
          productCard: {
            footer: {
              addToCartButton: {
                reactNode: (props?: ProductCardProps) => {
                  if (!props) return null;
                  const productValue: Product | undefined = props.product;
                  const cardId = String(productValue?.id ?? "");
                  const wasAdded = !!addedIds[cardId];
                  const label = wasAdded
                    ? "Added ✓"
                    : (props.addToCartText ?? "Add to cart");
                  return (
                    <button
                      type="button"
                      className={`pia-add-to-cart${wasAdded ? " pia-add-to-cart--added" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (productValue) props.onAddToCart?.(e, productValue);
                      }}
                      aria-label={
                        wasAdded
                          ? `${productValue?.name ?? "Product"} added to cart`
                          : `Add ${productValue?.name ?? "product"} to cart`
                      }
                    >
                      {label}
                    </button>
                  );
                },
              },
            },
          },
        },
      },
    }),
    [addedIds],
  );

  const piaTriggers: CheckoutTrigger[] = useMemo(() => {
    if (!product) return [];
    const engaged = (state: {
      currentAnswer: unknown;
      conversationHistory: unknown[];
    }) => !!state.currentAnswer || state.conversationHistory.length >= 1;

    return [
      {
        id: "pia-add-to-cart",
        label: "Add to cart",
        triggerWhen: engaged,
        onTrigger: () => addToCart(),
      },
      {
        id: "pia-buy-now",
        label: `Buy Now — ${fmtUsd(product.price)}`,
        triggerWhen: engaged,
        onTrigger: () => openBuyNow(),
      },
      {
        id: "pia-checkout",
        label: "Add + Checkout",
        triggerWhen: engaged,
        onTrigger: () => startRoutedCheckout(),
      },
      {
        id: "pia-bundle",
        label: `Buy 2, save 25% — ${fmtUsd(product.price * 2 * 0.75)}`,
        triggerWhen: (state) => state.conversationHistory.length >= 2,
        onTrigger: () => {
          cart.clear();
          cart.add(
            {
              id: `${product.id}-bundle`,
              name: `${product.name} — Bundle of 2 (25% off)`,
              price: product.price * 2 * 0.75,
              imageUrl: product.imageUrl,
            },
            1,
          );
          const target =
            CHECKOUT_ENTRY[base] ?? `${base}/checkout/recommendations`;
          nav(
            auth.user
              ? target
              : `${base}/login?redirect=${encodeURIComponent(target)}`,
          );
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, base, cart, nav, auth.user]);

  if (loading)
    return (
      <main className="page-product">
        <div className="muted">Loading…</div>
      </main>
    );
  if (!product)
    return (
      <main className="page-product">
        <div className="muted">Product not found.</div>
      </main>
    );

  return (
    <>
      <main className="page-product">
        <div className="product-hero">
          <div className="product-hero-image">
            <img src={product.imageUrl} alt="" />
          </div>
          <div className="product-hero-body">
            <h1>{product.name}</h1>
            <div className="product-hero-price">{fmtUsd(product.price)}</div>
            {product.description && (
              <p className="muted">{product.description}</p>
            )}
            <div className="product-hero-cta">
              <Button type="button" variant="outline" onClick={addToCart}>
                Add to cart
              </Button>
              <Button type="button" variant="outline" onClick={openBuyNow}>
                Buy Now
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={startRoutedCheckout}
              >
                Add + Checkout
              </Button>
            </div>
          </div>
        </div>

        <section className="pia-panel">
          <h2>Ask about this product</h2>
          <CioPia
            apiKey={CIO_API_KEY}
            itemId={product.id}
            itemName={product.name}
            checkoutTriggers={piaTriggers}
            callbacks={{ onAddToCart: handlePiaAddToCart }}
            componentOverrides={piaComponentOverrides}
          />
        </section>

        <section className="cross-sell">
          <h2>You might also like</h2>
          <RecommendationsRail
            seedQuery={product.name}
            onAdd={(p) =>
              cart.add({
                id: p.id,
                name: p.name,
                price: p.price,
                imageUrl: p.imageUrl,
              })
            }
          />
        </section>
      </main>

      {buyNowOpen && (
        <BuyNowFlow
          product={{ id: product.id, name: product.name, price: product.price }}
          onClose={() => setBuyNowOpen(false)}
        />
      )}
    </>
  );
}
