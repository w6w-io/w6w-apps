import { assertEquals } from "@std/assert";
import membershipList from "../../actions/membership-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("membership-list: hits /api/community/memberships with the given filters", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1 }]) }]);
  await membershipList.execute({ community: 9, contact: 42 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/community/memberships");
  assertEquals(queryOf(calls[0].url), { community: "9", contact: "42" });
});
