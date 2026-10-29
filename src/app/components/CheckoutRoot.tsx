import type { ReactNode } from 'react';

/** Every library stylesheet is scoped under `.cio-checkout-root`, so each built-in step renders it. */
export default function CheckoutRoot({ children }: { children: ReactNode }) {
  return <div className="cio-checkout-root">{children}</div>;
}
