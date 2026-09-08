import { assertEquals } from "@std/assert";
import markLeadEventAsRead from "../../actions/mark-lead-event-as-read.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("mark-lead-event-as-read: POSTs event_id, omitting time_read when unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await markLeadEventAsRead.execute({ leadId: "abc", eventId: "evt1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/leads/abc/events/mark_as_read");
  assertEquals(JSON.parse(calls[0].body!), { event_id: "evt1" });
});

Deno.test("mark-lead-event-as-read: includes time_read when provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await markLeadEventAsRead.execute(
    { leadId: "abc", eventId: "evt1", timeRead: "2022-07-21T20:54:42+00:00" },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!), {
    event_id: "evt1",
    time_read: "2022-07-21T20:54:42+00:00",
  });
});

Deno.test("mark-lead-event-as-read: is declared idempotent", () => {
  assertEquals(markLeadEventAsRead.idempotent, true);
});
