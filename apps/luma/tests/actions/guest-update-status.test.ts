import { assertEquals } from "@std/assert";
import guestUpdateStatus from "../../actions/guest-update-status.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("guest-update-status: posts event_id, guest_id and status", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await guestUpdateStatus.execute(
    { eventId: "evt-1", guestId: "gst-1", status: "declined", shouldRefund: true },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/events/guests/update-status");
  assertEquals(JSON.parse(calls[0].body!), {
    event_id: "evt-1",
    guest_id: "gst-1",
    status: "declined",
    should_refund: true,
  });
});
