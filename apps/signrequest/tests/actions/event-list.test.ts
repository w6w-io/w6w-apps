import { assertEquals } from "@std/assert";
import eventList from "../../actions/event-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("event-list: GETs /events/ filtered by document uuid and event type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { count: 0, results: [] } }]);
  await eventList.execute({ documentUuid: "doc-1", eventType: "signed" }, ctx);
  assertEquals(pathOf(calls[0]), "/api/v1/events/");
  const q = queryOf(calls[0]);
  assertEquals(q.get("document__uuid"), "doc-1");
  assertEquals(q.get("event_type"), "signed");
});
