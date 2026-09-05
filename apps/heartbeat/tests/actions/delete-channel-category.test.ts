import { assertEquals } from "@std/assert";
import deleteChannelCategory from "../../actions/delete-channel-category.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("delete-channel-category: DELETE /channelCategories/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await deleteChannelCategory.execute({ channelCategoryID: "c1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v0/channelCategories/c1");
});

Deno.test("delete-channel-category: is idempotent", () => {
  assertEquals(deleteChannelCategory.idempotent, true);
});
