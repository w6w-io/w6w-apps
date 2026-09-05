import { assertEquals } from "@std/assert";
import placementChangeStage from "../../actions/placement-change-stage.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("placement-change-stage: PATCHes a flat body with the new stage", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { placement: { id: 1, stage_id: 2 }, references: [] } },
  ]);
  await placementChangeStage.execute({
    id: 1,
    stageId: 2,
    position: 3,
    proceed: false,
    disqualifyReasonId: 7,
    runActions: true,
  }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/c/123/placements/1/change_stage");
  assertEquals(JSON.parse(calls[0].body!), {
    stage_id: 2,
    position: 3,
    proceed: false,
    disqualify_reason_id: 7,
    run_actions: true,
  });
});

Deno.test("placement-change-stage: not idempotent — run_actions/position can have retry-unsafe effects", () => {
  assertEquals(placementChangeStage.idempotent, false);
});
