import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/quote-get.ts";

Deno.test("quote-get: GETs /quotes/{id}", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "q1" } }]);
  await action.execute({ quoteId: "q1" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/quotes/q1");
});
