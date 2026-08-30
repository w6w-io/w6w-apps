import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-export-status.ts";

Deno.test("get-export-status: GETs [/groups/{id}]/reports/{reportId}/exports/{exportId}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "exp1", status: "Running", percentComplete: 40 },
  }]);
  const out = await action.execute({ reportId: "r1", exportId: "exp1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/reports/r1/exports/exp1");
  assertEquals(out.status, "Running");
  assertEquals(out.percentComplete, 40);
});

Deno.test("get-export-status: workspace-scoped path when Workspace ID is set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ groupId: "w1", reportId: "r1", exportId: "exp1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/groups/w1/reports/r1/exports/exp1");
});
