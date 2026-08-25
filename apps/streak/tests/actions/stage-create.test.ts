import { assertEquals } from "@std/assert";
import stageCreate from "../../actions/stage-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("stage-create: PUTs a form body", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "New Stage", key: "5008" } }]);
  await stageCreate.execute({ pipelineKey: "p1", name: "New Stage" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v1/pipelines/p1/stages");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "name=New+Stage");
});
