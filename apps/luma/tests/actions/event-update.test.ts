import { assertEquals } from "@std/assert";
import eventUpdate from "../../actions/event-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-update: posts only event_id when nothing else changes", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await eventUpdate.execute({ eventId: "evt-1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/events/update");
  assertEquals(JSON.parse(calls[0].body!), { event_id: "evt-1" });
  assertEquals(out, { ok: true });
});

Deno.test("event-update: only the named field changes, everything else stays unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await eventUpdate.execute({ eventId: "evt-1", name: "New Name" }, ctx);

  assertEquals(JSON.parse(calls[0].body!), { event_id: "evt-1", name: "New Name" });
});

Deno.test("event-update: latitude/longitude combine into coordinate, same as create", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await eventUpdate.execute({ eventId: "evt-1", latitude: 1, longitude: 2 }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.coordinate, { latitude: 1, longitude: 2 });
});
