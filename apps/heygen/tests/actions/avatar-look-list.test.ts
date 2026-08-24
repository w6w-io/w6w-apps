import { assertEquals } from "@std/assert";
import avatarLookList from "../../actions/avatar-look-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("avatar-look-list: lists looks and forwards filters, including the group filter", async () => {
  const { ctx, calls } = mockCtx([
    { body: listEnvelope([{ id: "lk_1", name: "Business Suit", avatar_type: "photo_avatar" }]) },
  ]);
  const out = await avatarLookList.execute(
    { groupId: "ag_1", avatarType: "photo_avatar" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v3/avatars/looks");
  assertEquals(queryOf(calls[0].url), { group_id: "ag_1", avatar_type: "photo_avatar" });
  assertEquals(out, {
    items: [{ id: "lk_1", name: "Business Suit", avatar_type: "photo_avatar" }],
    hasMore: false,
    nextToken: null,
  });
});
