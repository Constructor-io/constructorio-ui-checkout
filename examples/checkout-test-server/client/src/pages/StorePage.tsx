import { FormEvent, useEffect, useState } from "react";

import { Button } from "@constructor-io/constructorio-ui-components";

import ProductCard from "../components/ProductCard";
import { useFlowBasePath } from "../flows/shared/basePath";
import { browseProducts, searchProducts, StoreProduct } from "../lib/search";

export default function StorePage() {
  const base = useFlowBasePath();
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
