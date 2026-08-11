import { assert, assertEquals } from "@std/assert";
import accountUsageGet from "../../actions/account-usage-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("account-usage-get: calls GET /v2/users/me/usage/monthly", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope({
        usageCycle: { startAt: "2026-08-01T00:00:00.000Z", endAt: "2026-08-31T23:59:59.999Z" },
        monthlyServiceUsage: {},
        dailyServiceUsages: [],
        totalUsageCreditsUsdAfterVolumeDiscount: 0.78,
      }),
    },
  ]);
  const out = await accountUsageGet.execute({}, ctx) as {
    totalUsageCreditsUsdAfterVolumeDiscount: number;
  };

  assertEquals(pathOf(calls[0].url), "/v2/users/me/usage/monthly");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.totalUsageCreditsUsdAfterVolumeDiscount, 0.78);
});

/**
 * `date` selects the billing *cycle* containing that date, not that day — and a
 * cycle starts on the account's billing anniversary, not the 1st.
 */
Deno.test("account-usage-get: the date selects a cycle and is passed through verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await accountUsageGet.execute({ date: "2026-07-15" }, ctx);
  assertEquals(queryOf(calls[0].url), { date: "2026-07-15" });

  const hint = accountUsageGet.params?.find((p) => p.key === "date")?.hint ?? "";
  assert(/cycle/i.test(hint), hint);
});
