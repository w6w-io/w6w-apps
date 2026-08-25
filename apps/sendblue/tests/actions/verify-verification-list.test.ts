import { assertEquals } from "@std/assert";
import verifyVerificationList from "../../actions/verify-verification-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("verify-verification-list: GETs /api/v2/verify/verifications", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], pagination: {} } }]);
  await verifyVerificationList.execute({ limit: 10, updatedAtGte: "2026-01-01T00:00:00Z" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/verify/verifications");
  assertEquals(queryOf(calls[0].url), { limit: "10", updated_at_gte: "2026-01-01T00:00:00Z" });
});
