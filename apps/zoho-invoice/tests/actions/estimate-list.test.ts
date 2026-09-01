import { assertEquals } from "@std/assert";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/estimate-list.ts";

Deno.test("estimate-list: GETs /estimates and passes zcrm_potential_id through", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "success", estimates: [{ estimate_id: "1" }] } },
  ]);
  const out = await action.execute({ zcrmPotentialId: "deal-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/invoice/v3/estimates");
  assertEquals(url.searchParams.get("zcrm_potential_id"), "deal-1");
  assertEquals(out.data, [{ estimate_id: "1" }]);
});

/**
 * Unlike List Invoices, Zoho Invoice's List Estimates documents no
 * `customer_id`/`status` query parameter — verified against
 * https://www.zoho.com/invoice/api/v3/estimates/. This test pins that this
 * action never sends either.
 */
Deno.test("estimate-list: never sends a customer_id or status query parameter", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "success", estimates: [] } },
  ]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("customer_id"), false);
  assertEquals(url.searchParams.has("status"), false);
});
