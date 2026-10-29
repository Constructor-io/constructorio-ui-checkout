import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import cors from "cors";
import { config } from "dotenv";
import express from "express";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

// Import payment routers after dotenv has populated process.env; the factory
// functions read env vars when invoked, so plain top-of-file imports are fine.
import { createStripeRouter } from "./stripe";
import { createSquareRouter } from "./square";
import { createFiservRouter } from "./fiserv";

const app = express();

const PORT = Number(process.env.PORT);
const CLIENT_URL = process.env.CLIENT_URL ?? "";

if (!PORT || !CLIENT_URL) {
  throw new Error("Missing PORT or CLIENT_URL. Run `cp .env.example .env` first.");
}

app.use((req, res, next) => {
  if (req.originalUrl === "/webhook") next();
  else express.json()(req, res, next);
});
app.use(cors({ origin: CLIENT_URL }));

// ---------------------------------------------------------------------------
// Hardcoded fixtures — auth, addresses, shipping
// ---------------------------------------------------------------------------
type User = {
  id: string;
  email: string;
  name: string;
  tier: "standard" | "vip";
};
const USERS: Array<User & { password: string }> = [
  {
    id: "u_demo",
    email: process.env.DEMO_USER_EMAIL ?? "",
    password: process.env.DEMO_USER_PASSWORD ?? "",
    name: "Demo Shopper",
    tier: "standard",
  },
  {
    id: "u_vip",
    email: process.env.DEMO_VIP_EMAIL ?? "",
    password: process.env.DEMO_VIP_PASSWORD ?? "",
    name: "VIP Shopper",
    tier: "vip",
  },
];

interface Address {
  id: string;
  label: string;
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

const ADDRESSES: Address[] = [
  {
    id: "addr_nyc",
    label: "Home — New York",
    line1: "123 Broadway, Apt 4B",
    city: "New York",
    region: "NY",
    postalCode: "10007",
    country: "US",
  },
  {
    id: "addr_sf",
    label: "Work — San Francisco",
    line1: "456 Market St, Fl 12",
    city: "San Francisco",
    region: "CA",
    postalCode: "94103",
    country: "US",
  },
  {
    id: "addr_london",
    label: "Holiday — London",
    line1: "78 Baker Street",
    city: "London",
    region: "",
    postalCode: "NW1 6XE",
    country: "GB",
  },
];

interface ShippingRate {
  id: string;
  label: string;
  amount: number; // dollars
  etaDays: string;
}

// Per-address rates. Different origins → different courier prices.
const SHIPPING: Record<string, ShippingRate[]> = {
  addr_nyc: [
    {
      id: "ship_std_nyc",
      label: "Standard (USPS)",
      amount: 4.99,
      etaDays: "3–5 business days",
    },
    {
      id: "ship_exp_nyc",
      label: "Express (UPS)",
      amount: 12.99,
      etaDays: "2 business days",
    },
    {
      id: "ship_ovn_nyc",
      label: "Overnight (FedEx)",
      amount: 24.99,
      etaDays: "Next business day",
    },
  ],
  addr_sf: [
    {
      id: "ship_std_sf",
      label: "Standard (USPS)",
      amount: 5.99,
      etaDays: "4–6 business days",
    },
    {
      id: "ship_exp_sf",
      label: "Express (UPS)",
      amount: 14.99,
      etaDays: "2 business days",
    },
  ],
  addr_london: [
    {
      id: "ship_std_ln",
      label: "Royal Mail Tracked",
      amount: 12.5,
      etaDays: "5–8 business days",
    },
    {
      id: "ship_exp_ln",
      label: "DHL Express",
      amount: 29.99,
      etaDays: "2–3 business days",
    },
    {
      id: "ship_ovn_ln",
      label: "DHL Priority",
      amount: 44.99,
      etaDays: "1–2 business days",
    },
  ],
};

const findShipping = (
  addressId?: string,
  shippingId?: string,
): ShippingRate | undefined => {
  if (!addressId || !shippingId) return undefined;
  return (SHIPPING[addressId] || []).find((r) => r.id === shippingId);
};

// ---------------------------------------------------------------------------
// POST /api/login — hardcoded credentials
// ---------------------------------------------------------------------------
app.post("/api/login", (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const user = USERS.find((u) => u.email === email && u.password === password);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const { password: _, ...safe } = user;
  res.json({ user: safe });
});

// ---------------------------------------------------------------------------
// GET /api/addresses — 3 hardcoded addresses (in a real app, keyed by user)
// GET /api/shipping-rates?addressId=X — per-address shipping options
// ---------------------------------------------------------------------------
app.get("/api/addresses", (_req, res) => {
  res.json({ addresses: ADDRESSES });
});

app.get("/api/shipping-rates", (req, res) => {
  const addressId = String(req.query.addressId || "");
  const rates = SHIPPING[addressId];
  if (!rates) {
    res
      .status(404)
      .json({ error: `No shipping rates for address '${addressId}'` });
    return;
  }
  res.json({ rates });
});

// ---------------------------------------------------------------------------
// Payment provider routers — each module owns its SDK init and env-var checks.
// A missing provider logs a warning and is skipped; the server keeps running.
// ---------------------------------------------------------------------------
const stripeRouter = createStripeRouter({
  clientUrl: CLIENT_URL,
  findShipping,
});
if (stripeRouter) app.use(stripeRouter);

const squareRouter = createSquareRouter();
if (squareRouter) app.use(squareRouter);

const fiservRouter = createFiservRouter();
if (fiservRouter) app.use(fiservRouter);

// ---------------------------------------------------------------------------
// Flow-state storage — powers the "backend StorageAdapter" showcase.
// In-memory Map keyed by user id. Restart the server to wipe it.
// A real app would put this in Redis / a DB with a TTL.
// ---------------------------------------------------------------------------
const FLOW_STATE = new Map<string, unknown>();

app.get("/api/flow-state", (req, res) => {
  const userId = String(req.query.userId || "");
  if (!userId) {
    res.status(400).json({ error: "userId query param required" });
    return;
  }
  res.json({ state: FLOW_STATE.get(userId) ?? null });
});

app.put("/api/flow-state", (req, res) => {
  const userId = String(req.query.userId || "");
  if (!userId) {
    res.status(400).json({ error: "userId query param required" });
    return;
  }
  FLOW_STATE.set(userId, req.body ?? null);
  res.json({ ok: true });
});

app.delete("/api/flow-state", (req, res) => {
  const userId = String(req.query.userId || "");
  if (!userId) {
    res.status(400).json({ error: "userId query param required" });
    return;
  }
  FLOW_STATE.delete(userId);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\nCheckout test server running at http://localhost:${PORT}`);
  console.log(
    `  POST   /api/login                        — Demo auth (${process.env.DEMO_USER_EMAIL}, password in .env)`,
  );
  console.log(
    `  GET    /api/addresses                    — Hardcoded address list`,
  );
  console.log(
    `  GET    /api/shipping-rates?addressId=…   — Per-address shipping options`,
  );
  console.log(
    `  POST   /api/checkout-session             — Create Stripe session${stripeRouter ? "" : " (disabled — set STRIPE_*)"}`,
  );
  console.log(
    `  POST   /api/checkout-session/update      — Rebuild session with new items/address/shipping`,
  );
  console.log(`  GET    /api/checkout-session/:id/status  — Session status`);
  console.log(
    `  POST   /api/checkout-session/:id/fulfill — Verify fulfillment`,
  );
  console.log(
    `  GET    /api/flow-state?userId=…          — Load persisted flow state`,
  );
  console.log(
    `  PUT    /api/flow-state?userId=…          — Save persisted flow state`,
  );
  console.log(
    `  DELETE /api/flow-state?userId=…          — Clear persisted flow state`,
  );
  console.log(
    `  POST   /api/square/session               — Square session (${squareRouter ? "enabled" : "disabled — set SQUARE_*"})`,
  );
  console.log(
    `  POST   /api/square/pay                   — Square payment via SDK PaymentsApi`,
  );
  console.log(
    `  POST   /api/fiserv/session               — Fiserv CommerceHub session (${fiservRouter ? "enabled" : "disabled — set COMMERCEHUB_*"})`,
  );
  console.log(
    `  POST   /api/fiserv/charge                — Fiserv charge of a captured session\n`,
  );
});
