import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/start-automation.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("start-automation: POSTs { contact_id } to the automation queue", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ automationId: "a1", contactId: "c1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/automations/a1/queue");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { contact_id: "c1" });
  assertEquals(out, { queued: true });
});

Deno.test("start-automation: logs through ctx.log rather than console", async () => {
  const { ctx, logs } = mockCtx([{ status: 204 }]);
  await action.execute!({ automationId: "a1", contactId: "c1" }, ctx);
  assertEquals(logs.length, 1);
  assertEquals(logs[0].level, "info");
});

Deno.test("start-automation: is not idempotent — repeat behaviour is a vendor-side setting", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("start-automation: surfaces the 409 raised when a contact was already queued", async () => {
  const { ctx } = mockCtx([{
    status: 409,
    body: {
      title: "An error occurred.",
      detail: "Conflict.",
      status: 409,
      type: "https://emailoctopus.com/api-documentation/v2#conflict",
    },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(action.execute!({ automationId: "a1", contactId: "c1" }, ctx)),
    Error,
  );
  assert(err.message.includes("409"));
});
