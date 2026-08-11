import { assert, assertEquals, assertRejects } from "@std/assert";
import webhookUpdate from "../../actions/webhook-update.ts";
import { bodyOf, entityBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * The destructive default: "If the events field is not specified, Webhook will
 * be registered to all events by default." So a PUT sent only to flip `active`
 * must NOT carry an empty events field — and must not carry one at all.
 */
Deno.test("webhook-update: re-activating alone never sends an events field", async () => {
  const { ctx, calls } = mockCtx([{ body: entityBody("webhook", { webhook_id: "uuid-1" }) }]);
  await webhookUpdate.execute({ webhookId: "uuid-1", active: true }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/uuid-1");
  assertEquals(bodyOf(calls[0]), { active: true });
  assert(!("events" in bodyOf(calls[0])), "an events field on a PUT re-subscribes to everything");
});

/** `active: false` must survive `compact`, which drops undefined but not false. */
Deno.test("webhook-update: active false is sent, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: entityBody("webhook", {}) }]);
  await webhookUpdate.execute({ webhookId: "uuid-1", active: false }, ctx);
  assertEquals(bodyOf(calls[0]), { active: false });
});

Deno.test("webhook-update: events_action rides along with an events list", async () => {
  const { ctx, calls } = mockCtx([{ body: entityBody("webhook", {}) }]);
  await webhookUpdate.execute(
    { webhookId: "uuid-1", events: ["call.created"], eventsAction: "add" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), { events_action: "add" });
  assertEquals(bodyOf(calls[0]), { events: ["call.created"] });
});

Deno.test("webhook-update: events_action without events is dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: entityBody("webhook", {}) }]);
  await webhookUpdate.execute({
    webhookId: "uuid-1",
    url: "https://x.example.com",
    eventsAction: "add",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("webhook-update: strips the token from the response", async () => {
  const { ctx } = mockCtx([
    { body: entityBody("webhook", { webhook_id: "uuid-1", token: "df76g76dpziygs567f0" }) },
  ]);
  const out = await webhookUpdate.execute({ webhookId: "uuid-1", active: true }, ctx);
  assert(
    !JSON.stringify(out).includes("df76g76dpziygs567f0"),
    "an update does not issue the secret, so it must not return it",
  );
});

Deno.test("webhook-update: an empty change set is rejected before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(webhookUpdate.execute({ webhookId: "uuid-1" }, ctx)),
    Error,
  );
  assertEquals(calls.length, 0);
});
