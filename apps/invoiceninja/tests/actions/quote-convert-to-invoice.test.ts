import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/quote-convert-to-invoice.ts";

Deno.test("quote-convert-to-invoice: POSTs /quotes/bulk with action convert", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: {} }]);
  await action.execute({ quoteId: "q1" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/quotes/bulk");
  assertEquals(JSON.parse(calls[0].body!), { action: "convert", ids: ["q1"] });
});
