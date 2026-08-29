import { assertEquals } from "@std/assert";
import accountDailyAnalyticsGet from "../../actions/account-daily-analytics-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("account-daily-analytics-get: GETs /accounts/analytics/daily", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ date: "2026-01-01", email_account: "a@b.com", sent: 5 }] },
  ]);
  const out = await accountDailyAnalyticsGet.execute(
    { start_date: "2026-01-01", end_date: "2026-01-31", emails: ["a@b.com"] },
    ctx,
  ) as unknown[];

  assertEquals(pathOf(calls[0].url), "/api/v2/accounts/analytics/daily");
  assertEquals(queryOf(calls[0].url).start_date, "2026-01-01");
  assertEquals(out.length, 1);
});
