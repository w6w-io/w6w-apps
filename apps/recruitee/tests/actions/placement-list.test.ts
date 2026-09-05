import { assertEquals } from "@std/assert";
import placementList from "../../actions/placement-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("placement-list: fetches the offer's pipeline, grouped by stage", async () => {
  const stages = [{ id: 1, name: "Sourced", placements: [] }];
  const { ctx, calls } = mockCtx([{ status: 200, body: { stages } }]);
  const out = await placementList.execute({
    offerId: 9,
    stageId: 1,
    qualified: true,
    sortBy: "position",
    sortOrder: "asc",
  }, ctx) as { stages: unknown };

  assertEquals(pathOf(calls[0].url), "/c/123/offers/9/placements");
  assertEquals(queryOf(calls[0].url), {
    stage_id: "1",
    qualified: "true",
    sort_by: "position",
    sort_order: "asc",
  });
  assertEquals(out.stages, stages);
});
