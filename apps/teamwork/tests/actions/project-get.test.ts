import { assertEquals } from "@std/assert";
import { mockTeamworkCtx } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

Deno.test("project-get: GETs /projects/api/v3/projects/{id}.json and unwraps `project`", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ body: { project: { id: 42, name: "Launch" } } }]);
  const out = await action.execute({ projectId: 42 }, ctx);
  assertEquals(calls[0].url, "https://acme.teamwork.com/projects/api/v3/projects/42.json");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: 42, name: "Launch" });
});
