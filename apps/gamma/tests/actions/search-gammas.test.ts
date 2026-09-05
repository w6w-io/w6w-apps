import { assertEquals } from "@std/assert";
import searchGammas from "../../actions/search-gammas.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("search-gammas: calls GET /gammas/search with the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { hits: [] } }]);
  await searchGammas.execute({ q: "roadmap", limit: 10 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1.0/gammas/search");
  assertEquals(queryOf(calls[0].url), { q: "roadmap", limit: "10" });
});

/**
 * "Search is being rolled out gradually... If you receive a 403, it means
 * access hasn't been enabled for you yet" — a genuinely different problem
 * from a bad key, and the body carries the vendor's own explanation.
 */
Deno.test("search-gammas: a 403 surfaces the vendor's not-enabled message, not a generic string", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: errorBody("Search is not enabled for this workspace yet.", 403) },
  ]);
  try {
    await searchGammas.execute({ q: "x" }, ctx);
    throw new Error("expected a rejection");
  } catch (err) {
    const message = (err as Error).message;
    if (!message.includes("Search is not enabled")) {
      throw new Error(`expected the vendor message, got: ${message}`);
    }
  }
});
