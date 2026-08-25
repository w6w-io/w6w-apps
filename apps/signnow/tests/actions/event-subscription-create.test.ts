import { assertEquals } from "@std/assert";
import eventSubscriptionCreate from "../../actions/event-subscription-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-subscription-create: POSTs the event/entity/callback envelope to /api/v2/events", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await eventSubscriptionCreate.execute(
    {
      event: "document.complete",
      entityId: "doc-1",
      callback: "https://example.com/hook",
    },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(out.created, true);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/api/v2/events");
  assertEquals(bodyOf(calls[0]), {
    event: "document.complete",
    entity_id: "doc-1",
    action: "callback",
    attributes: { callback: "https://example.com/hook" },
  });
});

Deno.test("event-subscription-create: forwards optional attributes and parses headers JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await eventSubscriptionCreate.execute(
    {
      event: "user.document.create",
      entityId: "user-1",
      callback: "https://example.com/hook",
      useTls12: true,
      integrationId: "int-1",
      docIdQueryParam: true,
      headers: '{"string_head":"test","int_head":12}',
    },
    ctx,
  );
  const body = bodyOf(calls[0]);
  assertEquals(body.attributes, {
    callback: "https://example.com/hook",
    use_tls_12: true,
    integration_id: "int-1",
    docid_queryparam: true,
    headers: { string_head: "test", int_head: 12 },
  });
});

Deno.test("event-subscription-create: uses the per-user Bearer sign hook (no separate Basic auth)", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await eventSubscriptionCreate.execute(
    { event: "document.complete", entityId: "doc-1", callback: "https://example.com/hook" },
    ctx,
  );
  // The mock client doesn't route through `sign`, but the action must not set
  // its own Authorization header — that's the auth method's job.
  assertEquals(calls[0].headers["authorization"], undefined);
});
