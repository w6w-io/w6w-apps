import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-update.ts";

Deno.test("webhook-update: sends only the provided fields, trigger coerced to a number", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "wh_1" } }]);
  await action.execute!({ webhookId: "wh_1", url: "https://example.com/new", trigger: "3" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { url: "https://example.com/new", trigger: 3 });
});

Deno.test("webhook-update: webhookId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "webhookId");
  assertEquals(calls.length, 0);
});

Deno.test("webhook-update: refuses an empty update", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ webhookId: "wh_1" }, ctx),
    Error,
    "no fields",
  );
  assertEquals(calls.length, 0);
});
