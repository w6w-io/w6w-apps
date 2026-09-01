import { assertEquals } from "@std/assert";
import guestSendInvites from "../../actions/guest-send-invites.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("guest-send-invites: posts event_id, guests and optional message", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await guestSendInvites.execute(
    { eventId: "evt-1", guests: [{ email: "a@b.com" }], message: "Hope to see you!" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/events/guests/send-invites");
  assertEquals(JSON.parse(calls[0].body!), {
    event_id: "evt-1",
    guests: [{ email: "a@b.com" }],
    message: "Hope to see you!",
  });
});
