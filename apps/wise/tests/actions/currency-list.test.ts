import { assertEquals } from "@std/assert";
import currencyList from "../../actions/currency-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("currency-list: GETs /currencies and wraps the bare array as items", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ code: "GBP", name: "British pound" }] }]);
  const out = await currencyList.execute({}, ctx) as { items: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/2026Q3/currencies");
  assertEquals(out.items.length, 1);
});

Deno.test("currency-list: requires no auth — the one action that reflects a genuinely public endpoint", () => {
  assertEquals(currencyList.requiresAuth, false);
});

Deno.test("currency-list: does not send an Authorization header itself", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await currencyList.execute({}, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});
