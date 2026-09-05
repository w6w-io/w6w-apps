import { assertEquals } from "@std/assert";
import rateGet from "../../actions/rate-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("rate-get: GETs /rates as a bare array, wrapped as items", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ rate: 1.3, source: "GBP", target: "USD" }] }]);
  const out = await rateGet.execute({ source: "GBP", target: "USD" }, ctx) as { items: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/2026Q3/rates");
  assertEquals(queryOf(calls[0].url), { source: "GBP", target: "USD" });
  assertEquals(out.items.length, 1);
});

Deno.test("rate-get: history params (from/to/group) pass through", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await rateGet.execute({
    source: "GBP",
    target: "USD",
    from: "2026-01-01",
    to: "2026-02-01",
    group: "day",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    source: "GBP",
    target: "USD",
    from: "2026-01-01",
    to: "2026-02-01",
    group: "day",
  });
});
