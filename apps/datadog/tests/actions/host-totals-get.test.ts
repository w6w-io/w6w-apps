import { assert, assertEquals } from "@std/assert";
import hostTotalsGet from "../../actions/host-totals-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("host-totals-get: calls GET /api/v1/hosts/totals", async () => {
  const { ctx, calls } = mockCtx([{ body: { total_active: 12, total_up: 15 } }]);
  const out = await hostTotalsGet.execute({}, ctx) as {
    total_active: number;
    total_up: number;
  };

  assertEquals(pathOf(calls[0].url), "/api/v1/hosts/totals");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, { total_active: 12, total_up: 15 });
});

Deno.test("host-totals-get: from overrides the active window", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await hostTotalsGet.execute({ from: 1_700_000_000 }, ctx);
  assertEquals(queryOf(calls[0].url), { from: "1700000000" });
});

/** Active is one hour, up is two — different numbers with different meanings. */
Deno.test("host-totals-get: the two windows are spelled out on the output fields", () => {
  const fields = hostTotalsGet.output as Array<{ key: string; label: string }>;
  assert(fields.find((f) => f.key === "total_active")?.label.includes("past hour"));
  assert(fields.find((f) => f.key === "total_up")?.label.includes("two hours"));
});
