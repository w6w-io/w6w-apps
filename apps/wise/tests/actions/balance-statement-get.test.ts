import { assertEquals } from "@std/assert";
import balanceStatementGet from "../../actions/balance-statement-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("balance-statement-get: GETs the statement.json path with the required query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { accountHolder: {}, transactions: [] } }]);
  await balanceStatementGet.execute(
    {
      profileId: 1,
      balanceId: 2,
      currency: "GBP",
      intervalStart: "2026-01-01T00:00:00Z",
      intervalEnd: "2026-02-01T00:00:00Z",
    },
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/2026Q3/profiles/1/balance-statements/2/statement.json");
  assertEquals(queryOf(calls[0].url), {
    currency: "GBP",
    intervalStart: "2026-01-01T00:00:00Z",
    intervalEnd: "2026-02-01T00:00:00Z",
  });
});

Deno.test("balance-statement-get: describes the SCA/country restriction rather than hiding it", () => {
  assertEquals(balanceStatementGet.description?.includes("SCA-protected"), true);
});

Deno.test("balance-statement-get: currency/intervalStart/intervalEnd are all required", () => {
  for (const key of ["currency", "intervalStart", "intervalEnd"]) {
    const p = balanceStatementGet.params?.find((p) => p.key === key);
    assertEquals(p?.required, true, key);
  }
});
