import { assertEquals } from "@std/assert";
import affiliateGroupRemove from "../../actions/affiliate-group-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("affiliate-group-remove: DELETEs the group sub-resource", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "janejameson", affiliate_group_id: null } }]);
  const out = await affiliateGroupRemove.execute({ affiliateId: "janejameson" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/1.6/affiliates/janejameson/group/");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.affiliate_group_id, null);
});
