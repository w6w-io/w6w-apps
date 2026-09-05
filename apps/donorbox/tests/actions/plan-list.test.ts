import { assertEquals } from "@std/assert";
import planList from "../../actions/plan-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("plan-list: hits /api/v1/plans", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 168, type: "monthly" }] }]);
  const out = await planList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/plans");
  assertEquals((out as { data: unknown[] }).data.length, 1);
});

Deno.test("plan-list: passes donor_name and campaign_id through", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await planList.execute({ donor_name: "Bruce Waine", campaign_id: 61 }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.donor_name, "Bruce Waine");
  assertEquals(query.campaign_id, "61");
});

Deno.test("plan-list: an unset filter is omitted from the query", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await planList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url).email, undefined);
});
