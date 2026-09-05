import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  page?: number;
  perPage?: number;
}

/**
 * `GET /api/v1/expenses` — verified against `getExpenses`. The OpenAPI
 * document's own parameter list for this operation is unusually sparse
 * (`include`/`index` only, no `page`/`per_page`/`status`), but a live probe
 * against `demo.invoiceninja.com` on 2026-09-05 confirmed `page`/`per_page`
 * are honoured (`meta.pagination` came back correctly populated) — the same
 * shared pagination every other resource in this app exposes. `status` was
 * not independently confirmed to change the result set, so it is left out
 * here.
 */
const expenseGetMany: ActionDefinition<Input> = {
  key: "expense-get-many",
  type: "search",
  resource: "expense",
  title: "List Expenses",
  description: "List expenses.",
  params: [...pagination],
  output: [{ key: "data", type: "array", label: "Expenses" }],

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request("/expenses", {
      query: { page: input.page, per_page: input.perPage },
    });
  },
};

export default expenseGetMany;
