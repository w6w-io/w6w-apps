import { assertEquals } from "@std/assert";
import getEventAttendance from "../../actions/get-event-attendance.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-event-attendance: GET /events/{id}/attendance, wrapped under `attendance`", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ startTime: "t0", endTime: "t1", attendees: [{ name: "Dwight", isUser: true }] }],
  }]);
  const out = await getEventAttendance.execute({ eventID: "e1" }, ctx) as { attendance: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v0/events/e1/attendance");
  assertEquals(out.attendance.length, 1);
});
