import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/invoice-update.ts";

Deno.test("invoice-update: PUTs /invoices/:id with the given fields", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { invoice: { url: "x" } } }]);
  await action.execute({ invoiceId: "7", fields: { reference: "003b" } }, ctx);
  assertEquals(calls[0].method, "PUT");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/invoices/7");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { invoice: { reference: "003b" } });
});
