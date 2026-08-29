import { assertEquals } from "@std/assert";
import tagList from "../../actions/tag-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-list: fetches a social set's tags", async () => {
  const { ctx, calls } = mockCtx([{
    body: listEnvelope([{ slug: "marketing", name: "Marketing" }]),
  }]);
  const out = await tagList.execute({ socialSetId: 4, limit: 50, offset: 0 }, ctx) as {
    results: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/v2/social-sets/4/tags");
  assertEquals(queryOf(calls[0].url), { limit: "50", offset: "0" });
  assertEquals(out.results.length, 1);
});
