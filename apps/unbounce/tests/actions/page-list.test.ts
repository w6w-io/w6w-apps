import { assertEquals } from "@std/assert";
import pageList from "../../actions/page-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("page-list: calls GET /pages with with_stats and role", async () => {
  const { ctx, calls } = mockCtx([{ body: { pages: [] } }]);
  await pageList.execute({ withStats: true, role: "author" }, ctx);

  assertEquals(pathOf(calls[0].url), "/pages");
  assertEquals(queryOf(calls[0].url), { with_stats: "true", role: "author" });
});

Deno.test("page-list: with_stats is omitted when not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { pages: [] } }]);
  await pageList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
