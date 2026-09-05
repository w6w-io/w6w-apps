import { assertEquals } from "@std/assert";
import pipelineStageList from "../../actions/pipeline-stage-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("pipeline-stage-list: GET /pipelines-and-stages with nested stages", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: 1, name: "New Business", stages: [{ id: 10, name: "Contacted" }] }] },
  ]);
  const result = await pipelineStageList.execute({ type: "lead" }, ctx) as {
    pipelines: Array<{ stages: Array<{ id: number }> }>;
  };

  assertEquals(pathOf(calls[0].url), "/v1/api/pipelines-and-stages");
  assertEquals(queryOf(calls[0].url), { type: "lead" });
  assertEquals(result.pipelines[0].stages[0].id, 10);
});

Deno.test("pipeline-stage-list: type is optional — no query param when omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await pipelineStageList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
