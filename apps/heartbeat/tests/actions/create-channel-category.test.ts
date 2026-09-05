import { assertEquals } from "@std/assert";
import createChannelCategory from "../../actions/create-channel-category.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-channel-category: PUT /channelCategories, returns the created object", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", name: "Alumni" } }]);
  const out = await createChannelCategory.execute({ name: "Alumni" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v0/channelCategories");
  assertEquals(out.name, "Alumni");
});

Deno.test("create-channel-category: is not idempotent", () => {
  assertEquals(createChannelCategory.idempotent, false);
});
