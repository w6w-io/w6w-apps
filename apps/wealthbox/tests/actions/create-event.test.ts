import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-event.ts";

Deno.test("create-event: is a non-idempotent perform requiring title/startsAt/endsAt", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  const required = (action.params ?? []).filter((p) => p.required).map((p) => p.key);
  assert(required.includes("title"));
  assert(required.includes("startsAt"));
  assert(required.includes("endsAt"));
});

Deno.test("create-event: POSTs /events with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute({
    title: "Client Meeting",
    startsAt: "2025-05-24 10:00 AM -0400",
    endsAt: "2025-05-24 11:00 AM -0400",
    allDay: false,
    location: "Conference Room",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/events");
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Client Meeting",
    starts_at: "2025-05-24 10:00 AM -0400",
    ends_at: "2025-05-24 11:00 AM -0400",
    all_day: false,
    location: "Conference Room",
  });
});

Deno.test("create-event: merges additionalProperties", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({
    title: "x",
    startsAt: "a",
    endsAt: "b",
    additionalProperties: { event_category: 2 },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).event_category, 2);
});
