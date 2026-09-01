import { assertEquals } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { dataEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-create: posts a related task", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 1 }) }]);
  await taskCreate.execute({
    content: "Contact Tom",
    resourceType: "lead",
    resourceId: 1,
    dueDate: "2014-09-27T16:32:56Z",
    remindAt: "2014-09-26T15:32:56Z",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/tasks");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.meta, { type: "task" });
  assertEquals(body.data.resource_type, "lead");
  assertEquals(body.data.due_date, "2014-09-27T16:32:56Z");
  assertEquals(body.data.remind_at, "2014-09-26T15:32:56Z");
});

Deno.test("task-create: a floating task omits resource fields entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 1 }) }]);
  await taskCreate.execute({ content: "Follow up" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("resource_type" in body.data, false);
  assertEquals("resource_id" in body.data, false);
});
