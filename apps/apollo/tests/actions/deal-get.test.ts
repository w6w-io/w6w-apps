import { assertEquals } from "@std/assert";
import dealGet from "../../actions/deal-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("deal-get: GETs /opportunities/{opportunity_id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { opportunity: { id: "d1" } } }]);
  const out = await dealGet.execute({ opportunity_id: "d1" }, ctx) as { deal: { id: string } };
  assertEquals(pathOf(calls[0].url), "/api/v1/opportunities/d1");
  assertEquals(out.deal.id, "d1");
});
