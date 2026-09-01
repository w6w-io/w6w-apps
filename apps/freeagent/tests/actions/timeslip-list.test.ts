import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/timeslip-list.ts";

Deno.test("timeslip-list: GETs /timeslips, turning user/task/project ids into full resource URLs", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { timeslips: [] } }]);
  await action.execute({ userId: "1", taskId: "2", projectId: "3" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/timeslips");
  assertEquals(url.searchParams.get("user"), "https://api.freeagent.com/v2/users/1");
  assertEquals(url.searchParams.get("task"), "https://api.freeagent.com/v2/tasks/2");
  assertEquals(url.searchParams.get("project"), "https://api.freeagent.com/v2/projects/3");
});
