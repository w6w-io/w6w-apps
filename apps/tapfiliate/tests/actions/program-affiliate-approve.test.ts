import { assertEquals } from "@std/assert";
import programAffiliateApprove from "../../actions/program-affiliate-approve.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("program-affiliate-approve: PUTs the nested approved sub-resource", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "janejameson", approved: true } }]);
  const out = await programAffiliateApprove.execute(
    { programId: "johns-affiliate-program", affiliateId: "janejameson" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(
    pathOf(calls[0].url),
    "/1.6/programs/johns-affiliate-program/affiliates/janejameson/approved/",
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(out.approved, true);
});
