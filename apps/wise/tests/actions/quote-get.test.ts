import { assertEquals } from "@std/assert";
import quoteGet from "../../actions/quote-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("quote-get: GETs /profiles/{profileId}/quotes/{quoteId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "q-1", rate: 1.3 } }]);
  const out = await quoteGet.execute({ profileId: 1, quoteId: "q-1" }, ctx) as { id: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/2026Q3/profiles/1/quotes/q-1");
  assertEquals(out.id, "q-1");
});
