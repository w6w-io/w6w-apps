import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-sharing-invite.ts";

Deno.test("send-sharing-invite: POSTs to the item's invite action", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemId: "01ABC", recipients: ["a@example.com"] }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/items/01ABC/invite");
  assertEquals(calls[0].method, "POST");
});

Deno.test("send-sharing-invite: wraps addresses as driveRecipient objects", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemId: "i", recipients: [" a@example.com ", "", "b@example.com"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!).recipients, [
    { email: "a@example.com" },
    { email: "b@example.com" },
  ]);
});

Deno.test("send-sharing-invite: defaults to read access, notified and sign-in required", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemId: "i", recipients: ["a@example.com"] }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.roles, ["read"]);
  assertEquals(body.sendInvitation, true);
  assertEquals(body.requireSignIn, true);
});

Deno.test("send-sharing-invite: granting silently is `sendInvitation: false`, not a missing key", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute(
    { itemId: "i", recipients: ["a@example.com"], sendInvitation: false, roles: ["write"] },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.sendInvitation, false);
  assertEquals(body.roles, ["write"]);
});

Deno.test("send-sharing-invite: carries the message and expiry when given", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({
    itemId: "i",
    recipients: ["a@example.com"],
    message: "have a look",
    expirationDateTime: "2026-12-31T00:00:00Z",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.message, "have a look");
  assertEquals(body.expirationDateTime, "2026-12-31T00:00:00Z");
});

Deno.test("send-sharing-invite: 207 Multi-Status is data, not an error", async () => {
  // Graph reports per-recipient failures inside a 2xx response.
  const { ctx } = mockCtx([{
    status: 207,
    body: {
      value: [
        { id: "p1", roles: ["read"] },
        { error: { code: "invalidRecipients", message: "nope" } },
      ],
    },
  }]);
  const out = await action.execute(
    { itemId: "i", recipients: ["a@example.com", "b@example.com"] },
    ctx,
  ) as { value: Array<Record<string, unknown>> };
  assertEquals(out.value.length, 2);
  assertEquals(Boolean(out.value[1].error), true);
});

Deno.test("send-sharing-invite: an empty recipient list is refused before the call", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => action.execute({ itemId: "i", recipients: ["  "] }, ctx) as Promise<unknown>,
    Error,
    "recipient",
  );
});

Deno.test("send-sharing-invite: is not idempotent — a replay emails everyone again", () => {
  assertEquals(action.idempotent, false);
});
