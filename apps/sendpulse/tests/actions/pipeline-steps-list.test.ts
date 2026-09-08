import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pipeline-steps-list.ts";

Deno.test("pipeline-steps-list: hits GET /crm/v1/pipelines/{id}/steps", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: 5 }] } }]);
  const result = await action.execute!({ pipelineId: 42 }, ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/crm/v1/pipelines/42/steps");
  assertEquals(result, { data: [{ id: 5 }] });
});
