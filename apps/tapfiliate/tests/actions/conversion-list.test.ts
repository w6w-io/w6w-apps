import { assertEquals } from "@std/assert";
import conversionList from "../../actions/conversion-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversion-list: encodes pending/use_profile_timezone as the literal word, not 1/0", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await conversionList.execute({ pending: true, useProfileTimezone: false }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.6/conversions/");
  assertEquals(queryOf(calls[0].url).pending, "true");
  // `false` renders to the string "false" and is sent (compact keeps it) — it
  // is not silently dropped the way an empty string would be.
  assertEquals(queryOf(calls[0].url).use_profile_timezone, "false");
});

Deno.test("conversion-list: full filter set maps to the documented snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await conversionList.execute(
    {
      programId: "p1",
      externalId: "ORD123",
      affiliateId: "jane",
      dateFrom: "2022-01-01",
      dateTo: "2025-12-31",
      page: 2,
    },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    program_id: "p1",
    external_id: "ORD123",
    affiliate_id: "jane",
    date_from: "2022-01-01",
    date_to: "2025-12-31",
    page: "2",
  });
});
