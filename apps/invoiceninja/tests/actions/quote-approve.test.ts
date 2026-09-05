import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/quote-approve.ts";

Deno.test("quote-approve: POSTs /quotes/bulk with action approve", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: {} }]);
  await action.execute({ quoteId: "q1" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/quotes/bulk");
  assertEquals(JSON.parse(calls[0].body!), { action: "approve", ids: ["q1"] });
});
