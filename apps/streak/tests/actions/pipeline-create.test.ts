import { assertEquals } from "@std/assert";
import pipelineCreate from "../../actions/pipeline-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pipeline-create: PUTs a form-urlencoded body, not JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "New", key: "p9" } }]);
  await pipelineCreate.execute({ name: "New", teamKey: "t1" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v1/pipelines");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "name=New&teamKey=t1");
});

Deno.test("pipeline-create: optional fields are omitted from the form when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await pipelineCreate.execute({ name: "New", teamKey: "t1", teamWide: true }, ctx);
  assertEquals(calls[0].body, "name=New&teamKey=t1&teamWide=true");
});
