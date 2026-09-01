import { assertEquals } from "@std/assert";
import leadStageUpdate from "../../actions/lead-stage-update.ts";
import { asMutation, mockCtx, pathOf, writeResult } from "../_helpers.ts";

Deno.test("lead-stage-update: metadata — idempotent", () => {
  assertEquals(leadStageUpdate.type, "perform");
  assertEquals(leadStageUpdate.idempotent, true);
});

Deno.test("lead-stage-update: PUT /leads/{leadId}/stages with {stageId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: writeResult("Updated", "l1") }]);
  const result = asMutation(
    await leadStageUpdate.execute({ leadId: "l1", stageId: "stage-2" }, ctx),
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/leads/l1/stages");
  assertEquals(JSON.parse(calls[0].body!), { stageId: "stage-2" });
  assertEquals(result.info, "Updated");
});
