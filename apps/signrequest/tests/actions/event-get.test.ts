import { assertEquals } from "@std/assert";
import eventGet from "../../actions/event-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-get: GETs /events/{id}/", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { uuid: "ev-1", event_type: "signed" } }]);
  const out = await eventGet.execute({ eventId: "ev-1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0]), "/api/v1/events/ev-1/");
  assertEquals(out.event_type, "signed");
});
