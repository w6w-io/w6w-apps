import { assertEquals } from "@std/assert";
import accountLimitsGet from "../../actions/account-limits-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("account-limits-get: calls GET /v2/users/me/limits and unwraps data", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope({
        monthlyUsageCycle: { startAt: "2026-08-01T00:00:00.000Z" },
        limits: { maxMonthlyUsageUsd: 300 },
        current: { monthlyUsageUsd: 43 },
      }),
    },
  ]);
  const out = await accountLimitsGet.execute({}, ctx) as {
    limits: Record<string, number>;
    current: Record<string, number>;
  };

  assertEquals(pathOf(calls[0].url), "/v2/users/me/limits");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.limits.maxMonthlyUsageUsd, 300);
  assertEquals(out.current.monthlyUsageUsd, 43);
});

Deno.test("account-limits-get: takes no parameters", () => {
  assertEquals(accountLimitsGet.params?.length, 0);
});
