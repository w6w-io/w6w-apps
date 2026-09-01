import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/identify.ts";

Deno.test("identify: POSTs id/email/data to /users/track", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: 200, message: "Success." } }]);
  const result = await action.execute!(
    { id: "u1", email: "a@b.com", data: { plan: "pro" } },
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://api.getvero.com/api/v2/users/track");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { id: "u1", email: "a@b.com", data: { plan: "pro" } });
  assertEquals(result, { success: true, message: "Success." });
});

Deno.test("identify: rejects a blank id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ id: "  ", email: "a@b.com" }, ctx),
    Error,
    "`id` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("identify: rejects a blank email", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ id: "u1", email: "" }, ctx),
    Error,
    "`email` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("identify: channels passes through as-is", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: 200, message: "Success." } }]);
  await action.execute!(
    {
      id: "u1",
      email: "a@b.com",
      channels: [{ type: "push", address: "TOKEN", platform: "android" }],
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).channels, [
    { type: "push", address: "TOKEN", platform: "android" },
  ]);
});

Deno.test("identify: createdAt and updateOnly map to extras", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: 200, message: "Success." } }]);
  await action.execute!(
    { id: "u1", email: "a@b.com", createdAt: "2026-01-01T00:00:00Z", updateOnly: true },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).extras, {
    created_at: "2026-01-01T00:00:00Z",
    update_only: "true",
  });
});

Deno.test("identify: extras is omitted entirely when neither field is set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: 200, message: "Success." } }]);
  await action.execute!({ id: "u1", email: "a@b.com" }, ctx);
  assertEquals("extras" in JSON.parse(calls[0].body!), false);
});

Deno.test("identify: a non-2xx response propagates as an Error", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { status: 401, message: "invalid credentials" } },
  ]);
  const err = await assertRejects(
    async () => await action.execute!({ id: "u1", email: "a@b.com" }, ctx),
    Error,
    "Vero 401",
  );
  assert(err.message.includes("invalid credentials"));
});
