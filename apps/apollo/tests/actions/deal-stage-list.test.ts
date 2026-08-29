import { assertEquals } from "@std/assert";
import dealStageList from "../../actions/deal-stage-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("deal-stage-list: GETs /opportunity_stages", async () => {
  const { ctx, calls } = mockCtx([{
    body: { opportunity_stages: [{ id: "s1", name: "Qualify" }] },
  }]);
  const out = await dealStageList.execute({}, ctx) as { opportunity_stages: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v1/opportunity_stages");
  assertEquals(out.opportunity_stages.length, 1);
});
