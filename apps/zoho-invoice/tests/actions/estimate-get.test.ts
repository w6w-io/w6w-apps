import { assertEquals } from "@std/assert";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/estimate-get.ts";

Deno.test("estimate-get: GETs /estimates/{id}", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "success", estimate: { estimate_id: "5" } } },
  ]);
  const out = await action.execute({ recordId: "5" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/invoice/v3/estimates/5");
  assertEquals(out, { estimate_id: "5" });
});
