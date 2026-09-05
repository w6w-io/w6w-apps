import type { ActionDefinition } from "@w6w/types";
import { HotmartClient, PAYMENTS_PREFIX } from "../lib/client.ts";
import { transactionRequiredParam } from "../lib/params.ts";

/**
 * `PUT /payments/api/v1/sales/{transaction}/billet` — verified against
 * `developers.hotmart.com/docs/en/v1/sales/sales-billet/` on 2026-09-05.
 * Generates a **new** bank payment slip (boleto) PDF for a pending
 * transaction and returns its URL. The caller must be the transaction's
 * seller.
 */
interface Input {
  transaction: string;
}

interface Output {
  billet_url?: string;
}

const salesBillet: ActionDefinition<Input, Output> = {
  key: "sales-billet",
  type: "perform",
  title: "Generate New Billet",
  description: "Generate a new bank payment slip (boleto) PDF for a transaction.",
  resource: "sales",
  // Regenerating a boleto has no destructive side effect — it just mints
  // another link for the same pending charge — so a retry is safe.
  idempotent: true,
  params: [transactionRequiredParam],
  output: [{ key: "billet_url", type: "string", label: "Billet URL" }],

  async execute(input, ctx) {
    const client = new HotmartClient(ctx);
    return await client.json<Output>(
      `${PAYMENTS_PREFIX}/sales/${encodeURIComponent(input.transaction)}/billet`,
      { method: "PUT" },
    );
  },
};

export default salesBillet;
