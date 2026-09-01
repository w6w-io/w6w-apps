import { assertEquals } from "@std/assert";
import eventHostAdd from "../../actions/event-host-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-host-add: posts event_id, email and optional fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await eventHostAdd.execute(
    { eventId: "evt-1", email: "host@example.com", accessLevel: "manager", isVisible: true },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/events/hosts/add");
  assertEquals(JSON.parse(calls[0].body!), {
    event_id: "evt-1",
    email: "host@example.com",
    access_level: "manager",
    is_visible: true,
  });
  assertEquals(out, { ok: true });
});
