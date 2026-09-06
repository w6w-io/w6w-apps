import { assertEquals, assertRejects } from "@std/assert";
import trackedTimeReportGet from "../../actions/tracked-time-report-get.ts";
import { hostOf, mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("tracked-time-report-get: sends from/to/groupBy/subGroupBy plus repeated id filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ subject: "Member A" }] } }]);
  const out = await trackedTimeReportGet.execute({
    from: "2021-12-20",
    to: "2021-12-27",
    groupBy: "Member",
    subGroupBy: "Project",
    expand: "Subject,Items($expand=Subject)",
    personIds: ["p1", "p2"],
  }, ctx) as { items: unknown[] };

  assertEquals(hostOf(calls[0].url), "https://time-attendance.prod.jibble.io");
  assertEquals(pathOf(calls[0].url), "/v1/TrackedTimeReport");
  const q = queryOf(calls[0].url);
  assertEquals(q.from, "2021-12-20");
  assertEquals(q.to, "2021-12-27");
  assertEquals(q.groupBy, "Member");
  assertEquals(q.subGroupBy, "Project");
  assertEquals(q["$expand"], "Subject,Items($expand=Subject)");
  assertEquals(queryAllOf(calls[0].url, "personIds"), ["p1", "p2"]);
  // The vendor's own example also lists a `personids` (lowercase) key — this app deliberately
  // sends only the camelCase form used everywhere else in the API. See the module doc.
  assertEquals(queryAllOf(calls[0].url, "personids"), []);
  assertEquals(out.items, [{ subject: "Member A" }]);
});

Deno.test("tracked-time-report-get: requires from, to, groupBy and subGroupBy", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        trackedTimeReportGet.execute(
          { from: "", to: "", groupBy: "Member", subGroupBy: "None" },
          ctx,
        ),
      ),
    Error,
    "from",
  );
});
