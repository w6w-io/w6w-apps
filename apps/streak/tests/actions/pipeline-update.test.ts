import { assertEquals } from "@std/assert";
import pipelineUpdate from "../../actions/pipeline-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pipeline-update: POSTs a JSON body without the pipelineKey field", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "Renamed" } }]);
  await pipelineUpdate.execute({ pipelineKey: "p1", name: "Renamed" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/pipelines/p1");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
});
