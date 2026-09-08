import { assertEquals, assertRejects } from "@std/assert";
import timesheetList from "../../actions/timesheet-list.ts";
import { hostOf, mockCtx, odataList, pathOf, queryOf } from "../_helpers.ts";

Deno.test("timesheet-list: mixes plain date/period keys with $-prefixed OData keys", async () => {
  const { ctx, calls } = mockCtx([{ body: odataList([{ personId: "p1" }], 4) }]);
  const out = await timesheetList.execute({
    date: "2021-09-13",
    period: "Day",
    searchTerm: "Emily",
    filter: "total ne duration'PT0S'",
    top: 20,
  }, ctx) as { items: unknown[]; count?: number };

  assertEquals(hostOf(calls[0].url), "https://time-attendance.prod.jibble.io");
  assertEquals(pathOf(calls[0].url), "/v1/Timesheets");
  const q = queryOf(calls[0].url);
  assertEquals(q.date, "2021-09-13");
  assertEquals(q.period, "Day");
  assertEquals(q.searchTerm, "Emily");
  assertEquals(q["$filter"], "total ne duration'PT0S'");
  assertEquals(q["$top"], "20");
  assertEquals(out.items, [{ personId: "p1" }]);
  assertEquals(out.count, 4);
});

Deno.test("timesheet-list: requires date", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(timesheetList.execute({ date: "", period: "Day" }, ctx)),
    Error,
    "date",
  );
});
