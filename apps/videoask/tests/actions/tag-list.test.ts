import { assertEquals } from "@std/assert";
import tagList from "../../actions/tag-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-list: GETs /tags with a positive default limit, unlike the vendor's own limit=0 example", async () => {
  const { ctx, calls } = mockCtx([{
    body: page([{ tag_id: "t1", title: "My tag" }], { count: 1 }),
  }]);
  const out = await tagList.execute({ limit: 50, offset: 0 }, ctx) as {
    count: number;
    results: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/tags");
  assertEquals(queryOf(calls[0].url), { limit: "50", offset: "0" });
  assertEquals(out.count, 1);
});

Deno.test("tag-list: an optional title filter is passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await tagList.execute({ title: "vip" }, ctx);
  assertEquals(queryOf(calls[0].url).title, "vip");
});
