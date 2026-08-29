import { assertEquals } from "@std/assert";
import toolJobList from "../../actions/tool-job-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-job-list: GET /tool_jobs", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uid: "j1", tool: "remove_bg" }] }]);
  const out = await toolJobList.execute({}, ctx) as unknown[];

  assertEquals(pathOf(calls[0].url), "/tool_jobs");
  assertEquals(out, [{ uid: "j1", tool: "remove_bg" }]);
});
