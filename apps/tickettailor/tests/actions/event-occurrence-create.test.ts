import { assertEquals } from "@std/assert";
import eventOccurrenceCreate from "../../actions/event-occurrence-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-occurrence-create: POSTs start/end date+time fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "ev_1" } }]);
  await eventOccurrenceCreate.execute(
    {
      eventSeriesId: "es_1",
      startDate: "2027-01-01",
      endDate: "2027-01-01",
      startTime: "19:00:00",
      hidden: false,
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/event_series/es_1/events");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("start_date"), "2027-01-01");
  assertEquals(body.get("start_time"), "19:00:00");
  // `false` is a meaningful, non-empty value and must survive form encoding.
  assertEquals(body.get("hidden"), "false");
});
