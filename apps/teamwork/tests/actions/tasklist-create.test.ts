import { assertEquals } from "@std/assert";
import { mockTeamworkCtx } from "../_helpers.ts";
import action from "../../actions/tasklist-create.ts";

Deno.test("tasklist-create: POSTs the V1 /projects/{id}/tasklists.json endpoint", async () => {
  const { ctx, calls } = mockTeamworkCtx([{
    status: 201,
    body: { TASKLISTID: "1", STATUS: "OK" },
  }]);
  await action.execute({ projectId: 42, name: "Sprint 1" }, ctx);
  assertEquals(calls[0].url, "https://acme.teamwork.com/projects/42/tasklists.json");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { "todo-list": { name: "Sprint 1" } });
});
