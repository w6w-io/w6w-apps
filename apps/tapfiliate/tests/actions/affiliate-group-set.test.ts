import { assertEquals } from "@std/assert";
import affiliateGroupSet from "../../actions/affiliate-group-set.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * The important part of this test: the body key is `group_id`, which is
 * documented ONLY in the page's Node.js code sample, not in its (empty)
 * "Arguments" prose section.
 */
Deno.test("affiliate-group-set: PUTs {group_id} — the undocumented-in-prose body field", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "janejameson", affiliate_group_id: "ag_eXampl3" },
  }]);
  const out = await affiliateGroupSet.execute({
    affiliateId: "janejameson",
    affiliateGroupId: "ag_eXampl3",
  }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.6/affiliates/janejameson/group/");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { group_id: "ag_eXampl3" });
  assertEquals(out.affiliate_group_id, "ag_eXampl3");
});
