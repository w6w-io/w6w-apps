import { assertEquals } from "@std/assert";
import updateChannelCategory from "../../actions/update-channel-category.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("update-channel-category: POST /channelCategories/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await updateChannelCategory.execute({ channelCategoryID: "c1", name: "Cohort 2" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v0/channelCategories/c1");
  assertEquals(JSON.parse(calls[0].body!), { name: "Cohort 2" });
});

Deno.test("update-channel-category: is idempotent", () => {
  assertEquals(updateChannelCategory.idempotent, true);
});
