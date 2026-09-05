import { assertEquals } from "@std/assert";
import programAffiliateDisapprove from "../../actions/program-affiliate-disapprove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("program-affiliate-disapprove: DELETEs the nested approved sub-resource", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "janejameson", approved: false } }]);
  const out = await programAffiliateDisapprove.execute(
    { programId: "johns-affiliate-program", affiliateId: "janejameson" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(
    pathOf(calls[0].url),
    "/1.6/programs/johns-affiliate-program/affiliates/janejameson/approved/",
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.approved, false);
});
