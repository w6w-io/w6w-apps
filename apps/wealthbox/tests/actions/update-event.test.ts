import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-event.ts";

Deno.test("update-event: requires eventId, title, startsAt and endsAt", () => {
  // Wealthbox's docs mark title/starts_at/ends_at required on update too.
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  const required = (action.params ?? []).filter((p) => p.required).map((p) => p.key);
  assert(required.includes("eventId"));
  assert(required.includes("title"));
  assert(required.includes("startsAt"));
  assert(required.includes("endsAt"));
});

Deno.test("update-event: PUTs /events/{id} with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute({
    eventId: 1,
    title: "Client Meeting",
    startsAt: "2025-05-24T10:00:00Z",
    endsAt: "2025-05-24T11:00:00Z",
    state: "confirmed",
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/v1/events/1");
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Client Meeting",
    starts_at: "2025-05-24T10:00:00Z",
    ends_at: "2025-05-24T11:00:00Z",
    state: "confirmed",
  });
});
