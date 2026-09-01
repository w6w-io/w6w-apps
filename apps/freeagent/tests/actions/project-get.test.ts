import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

Deno.test("project-get: GETs /projects/:id", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { project: { url: "x" } } }]);
  await action.execute({ projectId: "3" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/projects/3");
});
