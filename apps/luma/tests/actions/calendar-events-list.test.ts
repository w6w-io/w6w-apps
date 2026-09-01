import { assertEquals } from "@std/assert";
import calendarEventsList from "../../actions/calendar-events-list.ts";
import { listBody, mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("calendar-events-list: sends repeated query params for array filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody([]) }]);
  await calendarEventsList.execute(
    { platforms: ["luma", "external"], access: ["manage", "view"], status: "approved" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/calendars/events/list");
  assertEquals(queryAllOf(calls[0].url, "platforms"), ["luma", "external"]);
  assertEquals(queryAllOf(calls[0].url, "access"), ["manage", "view"]);
  assertEquals(queryOf(calls[0].url).status, "approved");
});

Deno.test("calendar-events-list: sort_column is only sent alongside a sort direction", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody([]) }, { body: listBody([]) }]);
  await calendarEventsList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url).sort_column, undefined);

  await calendarEventsList.execute({ sortDirection: "desc" }, ctx);
  assertEquals(queryOf(calls[1].url).sort_column, "start_at");
  assertEquals(queryOf(calls[1].url).sort_direction, "desc");
});
