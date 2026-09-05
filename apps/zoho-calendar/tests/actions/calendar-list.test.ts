import { assertEquals } from "@std/assert";
import { mockCalendarCtx } from "../_helpers.ts";
import action from "../../actions/calendar-list.ts";

Deno.test("calendar-list: GETs /calendars with no filters by default", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { calendars: [{ uid: "abc" }] } }]);
  const out = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/calendars");
  assertEquals(url.searchParams.has("category"), false);
  assertEquals(out, { calendars: [{ uid: "abc" }] });
});

Deno.test("calendar-list: passes category and showHiddenCal through", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { calendars: [] } }]);
  await action.execute({ category: "own", showHiddenCal: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("category"), "own");
  assertEquals(url.searchParams.get("showhiddencal"), "true");
});
