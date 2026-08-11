import { assertEquals } from "@std/assert";
import scheduleList from "../../actions/schedule-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("schedule-list: calls GET /v1/schedules and wraps the bare array", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: [
        {
          name: "Work Hours",
          isDefaultTimezone: true,
          timezone: "America/Denver",
          schedule: { monday: [{ start: "09:00", end: "17:00" }] },
        },
      ],
    },
  ]);
  const out = await scheduleList.execute({}, ctx) as { items: Array<{ name: string }> };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/schedules");
  assertEquals(queryOf(calls[0].url), {});
  // "Work Hours" is the schedule every user has, and the documented default for
  // both auto-scheduled tasks and recurring tasks.
  assertEquals(out.items[0].name, "Work Hours");
});

Deno.test("schedule-list: takes no parameters — it answers for the key's owner", () => {
  assertEquals(scheduleList.params, []);
});
