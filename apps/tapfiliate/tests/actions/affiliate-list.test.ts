import { assertEquals } from "@std/assert";
import affiliateList from "../../actions/affiliate-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("affiliate-list: maps every filter to its documented snake_case name", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await affiliateList.execute(
    {
      clickId: "click-1",
      sourceId: "1-ssssss",
      email: "jane@example-blog.inc",
      referralCode: "nwjinmy",
      parentId: "sandrasanderson",
      affiliateGroupId: "ag_eXampl3",
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.6/affiliates/");
  assertEquals(queryOf(calls[0].url), {
    click_id: "click-1",
    source_id: "1-ssssss",
    email: "jane@example-blog.inc",
    referral_code: "nwjinmy",
    parent_id: "sandrasanderson",
    affiliate_group_id: "ag_eXampl3",
  });
});
