import { assertEquals } from "@std/assert";
import tagList from "../../actions/tag-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * The whole point of this action: AWeber answers a bare array here, not the
 * {"entries": [...]} shape every other collection uses.
 */
Deno.test("tag-list: unwraps the bare array response, not an entries envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: ["alpha", "beta", "gamma"] }]);
  const out = await tagList.execute({ accountId: "1", listId: "2" }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/tags");
  assertEquals(out, { tags: ["alpha", "beta", "gamma"] });
});

Deno.test("tag-list: an empty response is an empty tag list, not undefined", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const out = await tagList.execute({ accountId: "1", listId: "2" }, ctx);
  assertEquals(out, { tags: [] });
});
