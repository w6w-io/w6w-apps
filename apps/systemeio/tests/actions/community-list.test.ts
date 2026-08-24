import { assertEquals } from "@std/assert";
import communityList from "../../actions/community-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("community-list: hits /api/community/communities", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, name: "Members" }]) }]);
  await communityList.execute({ query: "Members" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/community/communities");
  assertEquals(queryOf(calls[0].url), { query: "Members" });
});
