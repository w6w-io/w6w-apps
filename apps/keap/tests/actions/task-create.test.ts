import { assertEquals } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const CREATED = { id: "1", title: "Call back" };

/** `CreateTaskRequest.required` is exactly `["assigned_to_user_id"]`. Not the title. */
Deno.test("task-create: the assignee is the only required param", () => {
  const required = (taskCreate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["assignedToUserId"]);
});

Deno.test("task-create: POSTs the task under Keap's own property names", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await taskCreate.execute(
    { assignedToUserId: "7", title: "Call back", priority: "ESSENTIAL", contactId: "9" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/tasks");
  assertEquals(JSON.parse(calls[0].body!), {
    assigned_to_user_id: "7",
    title: "Call back",
    priority: "ESSENTIAL",
    contact_id: "9",
  });
});

/**
 * Keap declares `remind_time_mins` as `type: integer` with a STRING enum. The
 * declared type and the `example: 30` agree it is a number; the enum is a
 * defect in the document.
 */
Deno.test("task-create: the reminder is sent as a number, not the string the enum implies", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await taskCreate.execute({ assignedToUserId: "7", remindTimeMins: 30 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.remind_time_mins, 30);
  assertEquals(typeof body.remind_time_mins, "number");
});

Deno.test("task-create: an unset reminder is omitted entirely", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await taskCreate.execute({ assignedToUserId: "7", title: "x" }, ctx);
  assertEquals("remind_time_mins" in JSON.parse(calls[0].body!), false);
});

Deno.test("task-create: is declared non-idempotent — a retry is a second task", () => {
  assertEquals(taskCreate.idempotent, false);
});
