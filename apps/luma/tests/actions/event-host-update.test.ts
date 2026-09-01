import { assertEquals } from "@std/assert";
import eventHostUpdate from "../../actions/event-host-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-host-update: posts only the named fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await eventHostUpdate.execute(
    { eventId: "evt-1", email: "host@example.com", accessLevel: "check-in" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/events/hosts/update");
  assertEquals(JSON.parse(calls[0].body!), {
    event_id: "evt-1",
    email: "host@example.com",
    access_level: "check-in",
  });
});
