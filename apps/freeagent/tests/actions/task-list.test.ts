import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/task-list.ts";

Deno.test("task-list: GETs /tasks, turning projectId into a full resource URL", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { tasks: [] } }]);
  await action.execute({ projectId: "1", view: "active" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/tasks");
  assertEquals(url.searchParams.get("project"), "https://api.freeagent.com/v2/projects/1");
  assertEquals(url.searchParams.get("view"), "active");
});
