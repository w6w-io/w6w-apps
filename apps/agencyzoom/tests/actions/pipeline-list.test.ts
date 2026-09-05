import { assertEquals } from "@std/assert";
import pipelineList from "../../actions/pipeline-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("pipeline-list: GET /pipelines?type=lead, wraps the bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "New Business" }] }]);
  const result = await pipelineList.execute({ type: "lead" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/api/pipelines");
  assertEquals(queryOf(calls[0].url), { type: "lead" });
  assertEquals(result, { pipelines: [{ id: 1, name: "New Business" }] });
});

Deno.test("pipeline-list: an empty body normalizes to an empty array", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const result = await pipelineList.execute({ type: "service" }, ctx);
  assertEquals(result, { pipelines: [] });
});
