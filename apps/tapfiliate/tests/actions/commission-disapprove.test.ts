import { assertEquals } from "@std/assert";
import commissionDisapprove from "../../actions/commission-disapprove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("commission-disapprove: DELETEs the approved sub-resource", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, approved: false } }]);
  const out = await commissionDisapprove.execute({ commissionId: 1 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/1.6/commissions/1/approved/");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.approved, false);
});
