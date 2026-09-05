import { assertEquals } from "@std/assert";
import conversionUpdate from "../../actions/conversion-update.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversion-update: PATCHes with recalculate_commissions as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, amount: 17.95 } }]);
  const out = await conversionUpdate.execute(
    { conversionId: 1, amount: 17.95, externalId: "ORD123", recalculateCommissions: true },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.6/conversions/1/");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(queryOf(calls[0].url), { recalculate_commissions: "true" });
  assertEquals(JSON.parse(calls[0].body!), { amount: 17.95, external_id: "ORD123" });
  assertEquals(out.amount, 17.95);
});
