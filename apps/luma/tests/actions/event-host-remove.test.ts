import { assertEquals } from "@std/assert";
import eventHostRemove from "../../actions/event-host-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-host-remove: posts event_id + email", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await eventHostRemove.execute({ eventId: "evt-1", email: "host@example.com" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/events/hosts/remove");
  assertEquals(JSON.parse(calls[0].body!), { event_id: "evt-1", email: "host@example.com" });
  assertEquals(out, { ok: true });
});
