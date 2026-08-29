import { assertEquals } from "@std/assert";
import workflowRunGet from "../../actions/workflow-run-get.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workflow-run-get: GET /workflow_runs/{uid}", async () => {
  const { ctx, calls } = mockCtx([
    { body: { uid: "wr1", status: "completed", outputs: { image: { uid: "i1" } } } },
  ]);
  const out = await workflowRunGet.execute({ uid: "wr1" }, ctx) as unknown as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/workflow_runs/wr1");
  assertEquals(out.status, "completed");
});

Deno.test("workflow-run-get: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => workflowRunGet.execute({ uid: "" }, ctx));
});
