import { assertEquals } from "@std/assert";
import boxSearchByName from "../../actions/box-search-by-name.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("box-search-by-name: calls GET /search?name=", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: { boxes: [{ boxKey: "b1" }] } } }]);
  const out = await boxSearchByName.execute({ name: "Boaty" }, ctx) as { results: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v1/search");
  assertEquals(queryOf(calls[0].url), { name: "Boaty" });
  assertEquals(out.results, [{ boxKey: "b1" }]);
});

Deno.test("box-search-by-name: a missing boxes bucket comes back as an empty array", async () => {
  const { ctx } = mockCtx([{ body: { results: {} } }]);
  const out = await boxSearchByName.execute({ name: "nothing" }, ctx) as { results: unknown[] };
  assertEquals(out.results, []);
});
