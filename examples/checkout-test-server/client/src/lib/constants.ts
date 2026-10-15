export const CIO_API_KEY = import.meta.env.VITE_CIO_API_KEY;
export const SEED_ITEM_ID = import.meta.env.VITE_SEED_ITEM_ID;
export const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL ?? "";
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? "";

export const fmtUsd = (dollars: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    dollars,
  );
