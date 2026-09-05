import { assertEquals } from "@std/assert";
import commissionUpdate from "../../actions/commission-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("commission-update: PATCHes given fields, keeping an explicit false", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, approved: false } }]);
  const out = await commissionUpdate.execute(
    { commissionId: 1, approved: false, comment: "Amount adjusted" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.6/commissions/1/");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { approved: false, comment: "Amount adjusted" });
  assertEquals(out.approved, false);
});
