import { assertEquals } from "@std/assert";
import usageTeamStatistic from "../../actions/usage-team-statistic.ts";
import { mockCtx, okBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("usage-team-statistic: sends start_date/end_date, returns the array unwrapped", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ data: [{ date: 1, credits: 100 }] }) }]);
  const out = await usageTeamStatistic.execute({ startDate: 1000, endDate: 2000 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/usage.teamStatistic");
  assertEquals(queryOf(calls[0].url), { start_date: "1000", end_date: "2000" });
  assertEquals(out, [{ date: 1, credits: 100 }]);
});

Deno.test("usage-team-statistic: is a read action (no pagination)", () => {
  assertEquals(usageTeamStatistic.type, "read");
});
