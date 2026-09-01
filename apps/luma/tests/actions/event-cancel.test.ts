import { assertEquals } from "@std/assert";
import eventCancel from "../../actions/event-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-cancel: confirms with event_id + cancellation_token + should_refund", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await eventCancel.execute(
    { eventId: "evt-1", cancellationToken: "cnl-xyz", shouldRefund: true },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/events/cancel");
  assertEquals(JSON.parse(calls[0].body!), {
    event_id: "evt-1",
    cancellation_token: "cnl-xyz",
    should_refund: true,
  });
  assertEquals(out, { ok: true });
});

Deno.test("event-cancel: should_refund is omitted, not sent false, when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await eventCancel.execute({ eventId: "evt-1", cancellationToken: "cnl-xyz" }, ctx);
  assertEquals("should_refund" in JSON.parse(calls[0].body!), false);
});
