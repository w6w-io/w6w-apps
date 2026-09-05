import { assertEquals } from "@std/assert";
import listEventInstances from "../../actions/list-event-instances.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-event-instances: calls /calendar/v2/event_instances, NOT /events", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: collection("EventInstance", [
        {
          id: "1",
          attributes: { starts_at: "2026-09-06T15:00:00Z", ends_at: "2026-09-06T16:00:00Z" },
          relationships: { event: { data: { type: "Event", id: "e1" } } },
        },
      ]),
    },
  ]);
  const out = await listEventInstances.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/calendar/v2/event_instances");
  assertEquals(out.eventInstances[0].startsAt, "2026-09-06T15:00:00Z");
  assertEquals(out.eventInstances[0].eventId, "e1");
});

Deno.test("list-event-instances: orders by starts_at and filters a date range", async () => {
  const { ctx, calls } = mockCtx([{ body: collection("EventInstance", []) }]);
  await listEventInstances.execute({ startsAfter: "2026-09-01T00:00:00Z" }, ctx);

  const q = queryOf(calls[0].url);
  assertEquals(q["order"], "starts_at");
  assertEquals(q["where[starts_at][gte]"], "2026-09-01T00:00:00Z");
});
