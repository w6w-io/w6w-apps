import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-task.ts";

Deno.test("create-task: is a non-idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});

Deno.test("create-task: POSTs /task with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 1 } }]);
  await action.execute({
    subject: "Follow up",
    accountId: 5,
    dueDate: "2026-09-15",
    channel: "Phone",
    purpose: "Solicitation",
    userId: 9,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v2/task");
  assertEquals(JSON.parse(calls[0].body!), {
    AccountId: 5,
    Subject: "Follow up",
    DueDate: "2026-09-15",
    Channel: "Phone",
    Purpose: "Solicitation",
    UserId: 9,
  });
});

Deno.test("create-task: works unlinked to any constituent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ subject: "Reminder" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { Subject: "Reminder" });
});
