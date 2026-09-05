import { assertEquals } from "@std/assert";
import listThemes from "../../actions/list-themes.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-themes: calls GET /themes with compacted query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], hasMore: false, nextCursor: null } }]);
  await listThemes.execute({ query: "brand", type: "custom", limit: 10 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1.0/themes");
  assertEquals(queryOf(calls[0].url), { query: "brand", type: "custom", limit: "10" });
});

Deno.test("list-themes: omitted params are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], hasMore: false, nextCursor: null } }]);
  await listThemes.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
