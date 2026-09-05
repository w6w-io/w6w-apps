import { assertEquals } from "@std/assert";
import groupGet from "../../actions/group-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("group-get: calls GET /teams/groups/:id with billingCycle", async () => {
  const { ctx, calls } = mockCtx([{ body: { group: {}, billingCycle: {} } }]);
  await groupGet.execute({ groupId: "group_abc", billingCycle: "2025-01-15" }, ctx);
  assertEquals(pathOf(calls[0].url), "/teams/groups/group_abc");
  assertEquals(queryOf(calls[0].url), { billingCycle: "2025-01-15" });
});
