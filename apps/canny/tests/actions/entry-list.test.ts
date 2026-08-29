import { assertEquals } from "@std/assert";
import entryList from "../../actions/entry-list.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("entry-list: posts filters to /v1/entries/list", async () => {
  const { ctx, calls } = mockCtx([{ body: { entries: [], hasMore: false } }]);
  await entryList.execute({ type: "fixed", sort: "created", limit: 5 }, ctx);

  assertEquals(calls[0].url, "https://canny.io/api/v1/entries/list");
  assertEquals(bodyOf(calls[0]), { type: "fixed", sort: "created", limit: 5 });
});
