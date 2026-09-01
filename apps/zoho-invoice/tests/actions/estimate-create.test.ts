import { assertEquals } from "@std/assert";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/estimate-create.ts";

Deno.test("estimate-create: POSTs the fields to /estimates", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "success", estimate: { estimate_id: "5" } } },
  ]);
  await action.execute({ fields: { customer_id: "cust-1" } }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/invoice/v3/estimates");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { customer_id: "cust-1" });
});
