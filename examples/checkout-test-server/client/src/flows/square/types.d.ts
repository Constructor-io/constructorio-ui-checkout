import type { BasePaymentSession } from "@constructor-io/constructorio-ui-checkout";

interface SquarePaymentSession extends BasePaymentSession {
  applicationId: string;
  locationId: string;
}

declare module "@constructor-io/constructorio-ui-checkout" {
  interface PaymentSessionMap {
    square: SquarePaymentSession;
  }
}
