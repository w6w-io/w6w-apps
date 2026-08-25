import { assertEquals } from "@std/assert";
import eventSubscriptionUpdate from "../../actions/event-subscription-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-subscription-update: PUTs to /api/v2/events/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "sub-1" } }]);
  const out = await eventSubscriptionUpdate.execute(
    {
      eventSubscriptionId: "sub-1",
      event: "document.complete",
      entityId: "doc-1",
      callback: "https://example.com/hook2",
    },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0]), "/api/v2/events/sub-1");
  assertEquals(bodyOf(calls[0]), {
    event: "document.complete",
    entity_id: "doc-1",
    action: "callback",
    attributes: { callback: "https://example.com/hook2" },
  });
  assertEquals(out.id, "sub-1");
});
