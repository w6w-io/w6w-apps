import { assertEquals } from "@std/assert";
import processGet from "../../actions/process-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("process-get: polls a queued process by id", async () => {
  const { ctx, calls } = mockCtx([
    { body: { process_id: "pr_1", type: "file-import", status: "finished" } },
  ]);
  const out = await processGet.execute({ projectId: "p1", processId: "pr_1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/processes/pr_1");
  assertEquals(out, { process_id: "pr_1", type: "file-import", status: "finished" });
});
