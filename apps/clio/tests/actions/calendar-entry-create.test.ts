import { assertEquals } from "@std/assert";
import calendarEntryCreate from "../../actions/calendar-entry-create.ts";
import { envelope, mockCtx } from "../_helpers.ts";

/**
 * `calendar_owner` is the CALENDAR this entry files under, not a user — easy
 * to misread from the name alone.
 */
Deno.test("calendar-entry-create: calendarId is sent as calendar_owner, not a user ref", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: 1 }) }]);
  await calendarEntryCreate.execute(
    {
      summary: "Client meeting",
      startAt: "2026-09-01T15:00:00Z",
      endAt: "2026-09-01T16:00:00Z",
      calendarId: 3,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!).data;
  assertEquals(body.calendar_owner, { id: 3 });
  assertEquals("calendar_id" in body, false);
  assertEquals(body.summary, "Client meeting");
  assertEquals(body.start_at, "2026-09-01T15:00:00Z");
  assertEquals(body.end_at, "2026-09-01T16:00:00Z");
});
