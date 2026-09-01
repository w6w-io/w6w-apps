import { assertEquals } from "@std/assert";
import eventList from "../../actions/event-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-list: metadata", () => {
  assertEquals(eventList.type, "read");
  assertEquals(eventList.params?.length, 0);
});

Deno.test("event-list: GET /events, no query params, wraps the bare array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "e1" }] }]);
  const result = await eventList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/events");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(result, { events: [{ id: "e1" }] });
});
