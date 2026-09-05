import { assertEquals } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-create: POSTs to /tasks, splitting comma-separated invitees", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok", id: 1 } }]);
  await taskCreate.execute(
    { title: "Follow up", type: "call", invitees: "a@b.com, c@d.com" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/api/tasks");
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Follow up",
    type: "call",
    invitees: ["a@b.com", "c@d.com"],
  });
});

Deno.test("task-create: blank invitees omits the field rather than sending []", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await taskCreate.execute({ title: "Follow up" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("invitees" in body, false);
});

Deno.test("task-create: is declared non-idempotent", () => {
  assertEquals(taskCreate.idempotent, false);
});
