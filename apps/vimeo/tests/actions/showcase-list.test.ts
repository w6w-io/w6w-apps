import { assertEquals } from "@std/assert";
import showcaseList from "../../actions/showcase-list.ts";
import { collection, mockCtx, q, url } from "../_helpers.ts";

const showcase = { uri: "/users/152184/albums/3706071", name: "Holiday Videos" };

/** Showcases are `albums` in the path — the product word never appears there. */
Deno.test("showcase-list: hits /me/albums", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([showcase]) }]);
  const out = await showcaseList.execute({}, ctx);
  assertEquals(url(calls[0]).pathname, "/me/albums");
  assertEquals(out.total, 1);
});

Deno.test("showcase-list: forwards the privacy list, query, sort and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }]);
  await showcaseList.execute({
    query: "holiday",
    filterPrivacy: "anybody, password",
    sort: "last_modified",
    direction: "desc",
    page: 2,
    perPage: 100,
    fields: "uri,name",
  }, ctx);
  assertEquals(q(calls[0], "query"), "holiday");
  assertEquals(q(calls[0], "filter_privacy"), "anybody,password");
  assertEquals(q(calls[0], "sort"), "last_modified");
  assertEquals(q(calls[0], "direction"), "desc");
  assertEquals(q(calls[0], "page"), "2");
  assertEquals(q(calls[0], "per_page"), "100");
  assertEquals(q(calls[0], "fields"), "uri,name");
});

Deno.test("showcase-list: is a search action", () => {
  assertEquals(showcaseList.type, "search");
});
