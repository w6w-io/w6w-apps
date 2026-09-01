import { assertEquals } from "@std/assert";
import eventCancelRequest from "../../actions/event-cancel-request.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-cancel-request: returns the short-lived cancellation token", async () => {
  const { ctx, calls } = mockCtx([
    { body: { cancellation_token: "cnl-xyz", is_paid: true, guest_count: 12 } },
  ]);
  const out = await eventCancelRequest.execute({ eventId: "evt-1" }, ctx) as {
    cancellation_token: string;
    is_paid: boolean;
    guest_count: number;
  };

  assertEquals(pathOf(calls[0].url), "/v1/events/cancel/request");
  assertEquals(JSON.parse(calls[0].body!), { event_id: "evt-1" });
  assertEquals(out.cancellation_token, "cnl-xyz");
  assertEquals(out.is_paid, true);
  assertEquals(out.guest_count, 12);
});
