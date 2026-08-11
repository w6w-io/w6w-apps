import { assert, assertEquals } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-create: POSTs /v1/tasks with content-type set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await taskCreate.execute({ name: "Draft the brief", workspaceId: "ws1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/tasks");
  // Motion refuses a body-carrying request without this, before routing and
  // before auth — the 400 it returns names none of the three things wrong.
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), { name: "Draft the brief", workspaceId: "ws1" });
});

/** `duration` is `string | number`: minutes go as a number, the enum members as words. */
Deno.test("task-create: duration is sent as a number when it is minutes", async () => {
  const minutes = mockCtx([{ body: {} }]);
  await taskCreate.execute({ name: "n", workspaceId: "ws1", duration: "30" }, minutes.ctx);
  assertEquals((bodyOf(minutes.calls[0]) as { duration: unknown }).duration, 30);

  const reminder = mockCtx([{ body: {} }]);
  await taskCreate.execute({ name: "n", workspaceId: "ws1", duration: "REMINDER" }, reminder.ctx);
  assertEquals((bodyOf(reminder.calls[0]) as { duration: unknown }).duration, "REMINDER");
});

Deno.test("task-create: autoScheduled is accepted as typed JSON text", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await taskCreate.execute({
    name: "n",
    workspaceId: "ws1",
    autoScheduled: '{"startDate":"2026-08-12T00:00:00.000Z","schedule":"Work Hours"}',
  }, ctx);

  assertEquals((bodyOf(calls[0]) as { autoScheduled: unknown }).autoScheduled, {
    startDate: "2026-08-12T00:00:00.000Z",
    schedule: "Work Hours",
  });
});

Deno.test("task-create: labels are sent as a JSON array of names", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await taskCreate.execute({ name: "n", workspaceId: "ws1", labels: ["Marketing", "Q3"] }, ctx);
  assertEquals((bodyOf(calls[0]) as { labels: unknown }).labels, ["Marketing", "Q3"]);
});

Deno.test("task-create: unset fields are omitted rather than sent as null", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await taskCreate.execute({ name: "n", workspaceId: "ws1", description: "" }, ctx);
  assertEquals(Object.keys(bodyOf(calls[0]) as object).sort(), ["name", "workspaceId"]);
});

/**
 * Motion documents no idempotency key on any endpoint, so a retry creates a
 * second task. Marking this idempotent would license the runtime to do exactly
 * that after a dropped connection.
 */
Deno.test("task-create: is not idempotent, and dueDate is not forced", () => {
  assertEquals(taskCreate.idempotent, false);
  const dueDate = taskCreate.params?.find((p) => p.key === "dueDate");
  assert(dueDate !== undefined);
  assert(
    !dueDate.required,
    "dueDate is only required for a SCHEDULED task, which depends on the " +
      "workspace's status configuration and cannot be decided here",
  );
});
