import { assertEquals } from "@std/assert";
import titleList from "../../actions/title-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

/** A title has an id and a name and no description — Brex's shape, not an omission. */
const TITLE = { id: "tl_1", name: "Staff Engineer" };

Deno.test("title-list: GETs the collection and forwards name, limit and cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: page([TITLE]) }]);
  await titleList.execute({ name: "Staff", limit: 20, cursor: "c1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/titles");
  assertEquals(queryOf(calls[0].url), { name: "Staff", limit: "20", cursor: "c1" });
});

Deno.test("title-list: the page is normalized", async () => {
  const { ctx } = mockCtx([{ body: page([TITLE], null) }]);
  assertEquals(await titleList.execute({}, ctx), {
    items: [TITLE],
    next_cursor: null,
    count: 1,
  });
});

Deno.test("title-list: it is a search whose resource is the title", () => {
  assertEquals(titleList.type, "search");
  assertEquals(titleList.resource, "title");
});
