import { assertEquals, assertRejects } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-create: POSTs /v1/tasks with exactly one link field", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { taskId: "TK1" } } }]);
  await taskCreate.execute(
    { title: "Follow up", description: "Call back", phoneNumberId: "PN1" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/tasks");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.phoneNumberId, "PN1");
  assertEquals("conversationId" in body, false);
  assertEquals("activityId" in body, false);
});

Deno.test("task-create: rejects when zero link fields are given", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await taskCreate.execute({ title: "t", description: "d" }, ctx),
    Error,
    "exactly one",
  );
});

Deno.test("task-create: rejects when more than one link field is given", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () =>
      await taskCreate.execute(
        { title: "t", description: "d", phoneNumberId: "PN1", conversationId: "CN1" },
        ctx,
      ),
    Error,
    "exactly one",
  );
});

Deno.test("task-create: is a non-idempotent perform action", () => {
  assertEquals(taskCreate.type, "perform");
  assertEquals(taskCreate.idempotent, false);
});
