import { assertEquals } from "@std/assert";
import stageDelete from "../../actions/stage-delete.ts";
import { mockCtx, pathOf, successBody } from "../_helpers.ts";

Deno.test("stage-delete: DELETEs the stage", async () => {
  const { ctx, calls } = mockCtx([{ body: successBody() }]);
  const out = await stageDelete.execute({ pipelineKey: "p1", stageKey: "5001" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v1/pipelines/p1/stages/5001");
  assertEquals(out, { success: true });
});
