import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-create.ts";

Deno.test("task-create: POSTs to /list/{id}/task with mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1", name: "Do it" } }]);
  const result = await action.execute!({
    listId: "123",
    name: "Do it",
    content: "desc",
    assignees: [1, 2],
    tags: ["urgent"],
    status: "open",
    priority: 2,
    dueDate: "2026-08-01T00:00:00.000Z",
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/list/123/task");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Do it");
  assertEquals(body.content, "desc");
  assertEquals(body.assignees, [1, 2]);
  assertEquals(body.tags, ["urgent"]);
  assertEquals(body.priority, 2);
  assertEquals(body.due_date, Date.parse("2026-08-01T00:00:00.000Z"));
  assertEquals(result, { id: "t1", name: "Do it" });
});

Deno.test("task-create: forwards custom_fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1", name: "Do it" } }]);
  await action.execute!({
    listId: "123",
    name: "Do it",
    customFields: [{ id: "abc-123", value: "Gold" }],
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.custom_fields, [{ id: "abc-123", value: "Gold" }]);
});

Deno.test("task-create: omits custom_fields when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1", name: "Do it" } }]);
  await action.execute!({ listId: "123", name: "Do it" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("custom_fields" in body, false);
});
