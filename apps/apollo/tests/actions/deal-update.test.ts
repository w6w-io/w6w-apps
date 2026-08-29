import { assertEquals } from "@std/assert";
import dealUpdate from "../../actions/deal-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("deal-update: PATCHes /opportunities/{opportunity_id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { opportunity: { id: "d1", amount: "5000" } } }]);
  const out = await dealUpdate.execute({ opportunity_id: "d1", amount: "5000" }, ctx) as {
    deal: { amount: string };
  };
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v1/opportunities/d1");
  assertEquals(out.deal.amount, "5000");
});

Deno.test("deal-update: idempotent", () => {
  assertEquals(dealUpdate.idempotent, true);
});
