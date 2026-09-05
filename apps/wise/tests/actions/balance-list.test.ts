import { assertEquals } from "@std/assert";
import balanceList from "../../actions/balance-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("balance-list: GETs /profiles/{profileId}/balances with a comma-joined types filter", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, currency: "GBP" }] }]);
  const out = await balanceList.execute(
    { profileId: 1, types: ["STANDARD", "SAVINGS"] },
    ctx,
  ) as { items: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/2026Q3/profiles/1/balances");
  assertEquals(queryOf(calls[0].url), { types: "STANDARD,SAVINGS" });
  assertEquals(out.items.length, 1);
});

Deno.test("balance-list: accepts a pre-joined string too", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await balanceList.execute({ profileId: 1, types: "STANDARD" }, ctx);
  assertEquals(queryOf(calls[0].url), { types: "STANDARD" });
});

Deno.test("balance-list: types is required, with no vendor-side default", () => {
  const p = balanceList.params?.find((p) => p.key === "types");
  assertEquals(p?.required, true);
});
