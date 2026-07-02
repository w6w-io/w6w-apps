import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-task-project.ts";

Deno.test("add-task-project: POSTs /tasks/{id}/addProject with project", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ id: "t-1", project: "p-9" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/tasks/t-1/addProject");
  assertEquals(JSON.parse(calls[0].body!), { data: { project: "p-9" } });
});

Deno.test("add-task-project: forwards insert_after / insert_before / section when set", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({
    id: "t-1",
    project: "p-9",
    insert_after: "t-a",
    insert_before: "t-b",
    section: "s-9",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    data: { project: "p-9", insert_after: "t-a", insert_before: "t-b", section: "s-9" },
  });
});
