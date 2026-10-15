import { useEffect, useState } from "react";

export type FlowVariant =
  "full" | "guest" | "resume" | "one-page" | "expiry" | "hook-only" | "mixed";

const KEY = "demo.flowVariant";
const EVENT = "demo:variantChange";
const VALID: FlowVariant[] = [
  "full",
  "guest",
  "resume",
  "one-page",
  "expiry",
  "hook-only",
  "mixed",
];

export function readVariant(): FlowVariant {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw && (VALID as string[]).includes(raw)) {
      return raw as FlowVariant;
    }
  } catch {}
  return "full";
}

export function setVariant(v: FlowVariant) {
  try {
    sessionStorage.setItem(KEY, v);
    dispatchEvent(new Event(EVENT));
  } catch {}
}

export function clearVariant() {
  try {
    sessionStorage.removeItem(KEY);
    dispatchEvent(new Event(EVENT));
  } catch {}
}

export function resetDemoState() {
  clearVariant();
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("cio-checkout"))
      .forEach((k) => sessionStorage.removeItem(k));
    sessionStorage.removeItem("demo.cart");
    sessionStorage.removeItem("demo.authUser");
    localStorage.removeItem("demo.authUser");
  } catch {}
  location.href = "/";
}

export function useVariant(): FlowVariant {
  const [v, setV] = useState<FlowVariant>(() => readVariant());
  useEffect(() => {
    const handler = () => setV(readVariant());
    addEventListener(EVENT, handler);
    addEventListener("storage", handler);
    return () => {
      removeEventListener(EVENT, handler);
      removeEventListener("storage", handler);
    };
  }, []);
  return v;
}
