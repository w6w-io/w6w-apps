import { assertEquals } from "@std/assert";
import affiliateProspectList from "../../actions/affiliate-prospect-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("affiliate-prospect-list: maps filters to their documented snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await affiliateProspectList.execute(
    { email: "peter@example.inc", referralCode: "yza5njg", programId: "johns-affiliate-program" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.6/affiliate-prospects/");
  assertEquals(queryOf(calls[0].url), {
    email: "peter@example.inc",
    referral_code: "yza5njg",
    program_id: "johns-affiliate-program",
  });
});
