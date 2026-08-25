import { assertEquals } from "@std/assert";
import pipelineGet from "../../actions/pipeline-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pipeline-get: calls GET /pipelines/{pipelineKey}", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "Hiring" } }]);
  await pipelineGet.execute({ pipelineKey: "p1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/pipelines/p1");
});
