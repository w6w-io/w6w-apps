import type { ActionDefinition } from "@w6w/types";
import { HotmartClient, PAYMENTS_PREFIX } from "../lib/client.ts";
import { transactionRequiredParam } from "../lib/params.ts";

/**
 * `PUT /payments/api/v1/sales/{transaction}/refund` — verified against
 * `developers.hotmart.com/docs/en/v1/sales/sales-refund/` on 2026-09-05. The
 * transaction id is a **path** segment, not a body field — encoded here so a
 * transaction reference containing `/` or `?` can't reshape the request path.
 *
 * The success body is `{}` (HTTP 200, empty object) — every fact about the
 * outcome is the fact that this call did not throw. Not idempotent: a refund
 * changes money movement, and a repeat attempt hits Hotmart's own guard
 * (`refund_request_already_exists`) rather than silently no-op'ing.
 */
interface Input {
  transaction: string;
}

const salesRefund: ActionDefinition<Input> = {
  key: "sales-refund",
  type: "perform",
  title: "Refund Sale",
  description:
    "Refund an APPROVED or COMPLETE purchase. Not available for a trial-period sale, or one paid " +
    "via BACS/SEPA direct debit (the buyer must request those refunds from their bank).",
  resource: "sales",
  idempotent: false,
  params: [transactionRequiredParam],
  output: [{ key: "ok", type: "boolean", label: "Refunded" }],

  async execute(input, ctx) {
    const client = new HotmartClient(ctx);
    await client.json(`${PAYMENTS_PREFIX}/sales/${encodeURIComponent(input.transaction)}/refund`, {
      method: "PUT",
    });
    return { ok: true };
  },
};

export default salesRefund;
