import { assertEquals } from "@std/assert";
import listChannelCategories from "../../actions/list-channel-categories.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-channel-categories: GET /channelCategories, wrapped under `channelCategories`", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "c1", name: "Alumni" }] }]);
  const out = await listChannelCategories.execute({}, ctx) as { channelCategories: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v0/channelCategories");
  assertEquals(out.channelCategories.length, 1);
});
