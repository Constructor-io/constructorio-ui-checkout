import ConstructorIOClient from "@constructor-io/constructorio-client-javascript";

import { CIO_API_KEY } from "./constants";

export const cioClient = new ConstructorIOClient({ apiKey: CIO_API_KEY });

export interface StoreProduct {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  url?: string;
  data?: Record<string, unknown>;
}

const PLACEHOLDER_IMG =
  "https://placehold.co/400x300/e5e7eb/1f2937?text=Product";

interface RawItemData {
  id?: string | number;
  name?: string;
  price?: number;
  sale_price?: number;
  image_url?: string;
  imageUrl?: string;
  description?: string;
  url?: string;
  Pricing?: string | { price?: number; originalPrice?: number };
  [k: string]: unknown;
}

interface RawItem {
  id?: string | number;
  value?: string;
  price?: number;
  data?: RawItemData;
}

function extractPrice(dataObj: RawItemData): number {
  if (typeof dataObj.price === "number") return dataObj.price;
  if (typeof dataObj.sale_price === "number") return dataObj.sale_price;
  const pricingRaw = dataObj.Pricing;
  if (typeof pricingRaw === "string") {
    try {
      const parsed = JSON.parse(pricingRaw) as {
        price?: number;
        originalPrice?: number;
      };
      if (typeof parsed.price === "number") return parsed.price;
      if (typeof parsed.originalPrice === "number") return parsed.originalPrice;
    } catch {}
  } else if (pricingRaw && typeof pricingRaw === "object") {
    if (typeof pricingRaw.price === "number") return pricingRaw.price;
    if (typeof pricingRaw.originalPrice === "number")
      return pricingRaw.originalPrice;
  }
  return 0;
}

function toStoreProduct(raw: RawItem): StoreProduct {
  const dataObj: RawItemData = raw.data ?? {};
  return {
    id: String(dataObj.id ?? raw.id ?? raw.value ?? ""),
    name: String(raw.value ?? dataObj.name ?? "Product"),
    price: extractPrice(dataObj),
    imageUrl: dataObj.image_url || dataObj.imageUrl || PLACEHOLDER_IMG,
    description: dataObj.description,
    url: dataObj.url,
    data: dataObj as unknown as Record<string, unknown>,
  };
}

export async function browseProducts(opts?: {
  filterName?: string;
  filterValue?: string;
  numResults?: number;
  fallbackQuery?: string;
}): Promise<StoreProduct[]> {
  const numResults = opts?.numResults ?? 12;
  const filterName = opts?.filterName ?? "group_id";
  const filterValue = opts?.filterValue ?? "all";
  try {
    const res = await cioClient.browse.getBrowseResults(
      filterName,
      filterValue,
      {
        resultsPerPage: numResults,
      },
    );
    const items = res?.response?.results ?? [];
    if (items.length > 0) return items.map(toStoreProduct).filter((p) => p.id);
  } catch (err) {
    console.warn("[browse] API error, falling back to search", err);
  }
  return searchProducts(opts?.fallbackQuery ?? "sofa", numResults);
}

export async function searchProducts(
  query: string,
  numResults = 8,
): Promise<StoreProduct[]> {
  if (!query.trim()) return [];
  try {
    const res = await cioClient.search.getSearchResults(query, {
      resultsPerPage: numResults,
    });
    const items = res?.response?.results ?? [];
    return items.map(toStoreProduct).filter((p) => p.id);
  } catch (err) {
    console.warn("[search] error", err);
    return [];
  }
}
