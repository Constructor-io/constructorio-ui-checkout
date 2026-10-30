import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Chat,
  CioAsaProvider,
  normalizeItemToProduct,
} from "@constructor-io/constructorio-ui-asa";
import type {
  CheckoutTrigger,
  Product,
} from "@constructor-io/constructorio-ui-asa";
import { Button } from "@constructor-io/constructorio-ui-components";

import ProductCard from "../components/ProductCard";
import { useCart } from "../contexts/CartContext";
import { useFlowBasePath } from "../flows/shared/basePath";
import { ASA_DOMAIN, CIO_API_KEY } from "../lib/constants";
import {
  browseProducts,
  extractPrice,
  searchProducts,
  StoreProduct,
} from "../lib/search";

// The demo index keeps its price in a `Pricing` field, which ASA's default
// mapping does not read.
const normalizeAsaItem: typeof normalizeItemToProduct = (item, options) => ({
  ...normalizeItemToProduct(item, options),
  price: extractPrice(item.data ?? {}),
});

export default function StorePage() {
  const base = useFlowBasePath();
  const nav = useNavigate();
  const cart = useCart();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    browseProducts({ numResults: 12 })
      .then((res) => alive && setProducts(res))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const runSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setLoading(true);
      const res = await browseProducts({ numResults: 12 });
      setProducts(res);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await searchProducts(query, 12);
    setProducts(res);
    setLoading(false);
  };

  // Each button gets every product of the answer it renders under, all groups
  // flattened, so it picks the ones to buy.
  const asaTriggers: CheckoutTrigger[] = useMemo(() => {
    const addAll = (picks: Product[]) =>
      picks.forEach((p) =>
        cart.add({
          id: p.id,
          name: p.name,
          price: Number(p.salePrice ?? p.price) || 0,
          imageUrl: p.imageUrl,
        }),
      );

    return [
      {
        id: "asa-add-top-three",
        label: "Add top 3 to cart",
        onTrigger: ({ products: answer }) => addAll(answer.slice(0, 3)),
      },
      {
        id: "asa-buy-top-pick",
        label: "Buy the top pick",
        onTrigger: ({ products: answer }) => {
          cart.clear();
          addAll(answer.slice(0, 1));
          nav(`${base}/cart`);
        },
      },
    ];
  }, [cart, nav, base]);

  return (
    <main className="page-store">
      <div className="store-header">
        <div>
          <h1>Browse</h1>
        </div>
        <form onSubmit={runSearch} className="store-search">
          <input
            type="search"
            placeholder="Search products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </div>

      <section className="asa-panel">
        <h2>Ask the shopping assistant</h2>
        <CioAsaProvider
          apiKey={CIO_API_KEY}
          staticRequestConfigs={{ domain: ASA_DOMAIN }}
        >
          <Chat
            checkoutTriggers={asaTriggers}
            normalizeItem={normalizeAsaItem}
          />
        </CioAsaProvider>
      </section>

      {loading ? (
        <div className="muted">Loading products…</div>
      ) : products.length === 0 ? (
        <div className="muted">No products found.</div>
      ) : (
        <ul className="product-grid">
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard
                product={p}
                linkTo={`${base}/products/${encodeURIComponent(p.id)}`}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
