import { assertEquals } from "@std/assert";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

Deno.test("project-get: GETs the singular /project/{projectId} path", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { project: {} } }]);
  await action.execute({ projectId: "779597" }, ctx);
  assertEquals(calls[0].url, "https://api.freshbooks.com/projects/business/biz1/project/779597");
});
