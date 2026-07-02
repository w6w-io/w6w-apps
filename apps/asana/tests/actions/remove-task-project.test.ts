import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/remove-task-project.ts";

Deno.test("remove-task-project: POSTs /tasks/{id}/removeProject with project", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ id: "t-1", project: "p-9" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/tasks/t-1/removeProject");
  assertEquals(JSON.parse(calls[0].body!), { data: { project: "p-9" } });
});
