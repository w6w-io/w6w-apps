import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/invoice-get.ts";

Deno.test("invoice-get: GETs /invoices/:id", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { invoice: { url: "x" } } }]);
  await action.execute({ invoiceId: "7" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/invoices/7");
});
