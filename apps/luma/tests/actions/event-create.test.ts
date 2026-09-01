import { assertEquals } from "@std/assert";
import eventCreate from "../../actions/event-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-create: posts only the required fields when nothing else is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "evt-1" } }]);
  const out = await eventCreate.execute(
    { name: "Launch Party", startAt: "2026-10-01T18:00:00.000Z", timezone: "America/New_York" },
    ctx,
  ) as { id: string };

  assertEquals(pathOf(calls[0].url), "/v1/events/create");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Launch Party",
    start_at: "2026-10-01T18:00:00.000Z",
    timezone: "America/New_York",
  });
  assertEquals(out.id, "evt-1");
});

Deno.test("event-create: latitude/longitude are combined into one coordinate object", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "evt-2" } }]);
  await eventCreate.execute(
    {
      name: "Meetup",
      startAt: "2026-10-01T18:00:00.000Z",
      timezone: "America/New_York",
      latitude: 40.7128,
      longitude: -74.006,
    },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.coordinate, { latitude: 40.7128, longitude: -74.006 });
});

Deno.test("event-create: ticketTypes/registrationQuestions/feedbackEmail pass through as JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "evt-3" } }]);
  const ticketTypes = [{ name: "General", type: "free" }];
  await eventCreate.execute(
    {
      name: "Conf",
      startAt: "2026-10-01T18:00:00.000Z",
      timezone: "America/New_York",
      ticketTypes,
      feedbackEmail: { enabled: true, delay: "PT0M" },
    },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.ticket_types, ticketTypes);
  assertEquals(body.feedback_email, { enabled: true, delay: "PT0M" });
});
