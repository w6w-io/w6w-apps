import { assertEquals } from "@std/assert";
import commissionApprove from "../../actions/commission-approve.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("commission-approve: PUTs the approved sub-resource", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, approved: true } }]);
  const out = await commissionApprove.execute({ commissionId: 1 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.6/commissions/1/approved/");
  assertEquals(calls[0].method, "PUT");
  assertEquals(out.approved, true);
});
