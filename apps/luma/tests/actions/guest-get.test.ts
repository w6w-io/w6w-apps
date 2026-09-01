import { assertEquals } from "@std/assert";
import guestGet from "../../actions/guest-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("guest-get: looks up by event_id + guest identifier", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "gst-1", user_email: "a@b.com" } }]);
  const out = await guestGet.execute({ eventId: "evt-1", guestId: "a@b.com" }, ctx) as {
    user_email: string;
  };

  assertEquals(pathOf(calls[0].url), "/v1/events/guests/get");
  assertEquals(queryOf(calls[0].url), { event_id: "evt-1", id: "a@b.com" });
  assertEquals(out.user_email, "a@b.com");
});
