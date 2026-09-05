import { assert, assertEquals, assertRejects } from "@std/assert";
import taskAssign from "../../actions/task-assign.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-assign: calls POST /1/task/assign as JSON with object_type_id (not objectID)", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 0, account_id: "12345" } }]);
  await taskAssign.execute(
    { contactIds: "5,6", messageId: 1, dueDateDays: 7, taskOwner: "0" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/1/task/assign");
  assertEquals(calls[0].headers["content-type"], "application/json");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.object_type_id, 0);
  assertEquals(body.ids, [5, 6]);
  assertEquals(body.message.id, 1);
  assertEquals(body.message.due_date, 7);
  assertEquals(body.message.task_owner, 0);
});

Deno.test("task-assign: rejects before any request without contactIds or groupId", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(() => Promise.resolve(taskAssign.execute({ messageId: 1 }, ctx)));
  assert(err instanceof Error);
  assertEquals(calls.length, 0);
});

Deno.test("task-assign: groupId alone is accepted in place of contactIds", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 0 } }]);
  await taskAssign.execute({ groupId: "9", messageId: 1 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.group_id, 9);
  assertEquals(body.ids, undefined);
});
