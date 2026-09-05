import { assertEquals } from "@std/assert";
import clickList from "../../actions/click-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("click-list: maps filters to their documented snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }] }]);
  const out = await clickList.execute(
    {
      programId: "johns-affiliate-program",
      affiliateId: "janejameson",
      dateFrom: "2022-01-01",
      dateTo: "2025-12-31",
    },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.6/clicks/");
  assertEquals(queryOf(calls[0].url), {
    program_id: "johns-affiliate-program",
    affiliate_id: "janejameson",
    date_from: "2022-01-01",
    date_to: "2025-12-31",
  });
  assertEquals(out.items, [{ id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }]);
});
