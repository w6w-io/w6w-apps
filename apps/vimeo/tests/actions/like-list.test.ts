import { assert, assertEquals } from "@std/assert";
import likeList from "../../actions/like-list.ts";
import { collection, mockCtx, q, url, video } from "../_helpers.ts";

Deno.test("like-list: hits /me/likes", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([video(1)]) }]);
  const out = await likeList.execute({}, ctx);
  assertEquals(url(calls[0]).pathname, "/me/likes");
  assertEquals(out.total, 1);
});

Deno.test("like-list: forwards the query, embeddable pair, sort and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }]);
  await likeList.execute({
    query: "reel",
    filterEmbeddable: false,
    sort: "plays",
    page: 2,
    perPage: 50,
    fields: "uri",
  }, ctx);
  assertEquals(q(calls[0], "query"), "reel");
  assertEquals(q(calls[0], "filter"), "embeddable");
  assertEquals(q(calls[0], "filter_embeddable"), "false");
  assertEquals(q(calls[0], "sort"), "plays");
  assertEquals(q(calls[0], "page"), "2");
  assertEquals(q(calls[0], "per_page"), "50");
  assertEquals(q(calls[0], "fields"), "uri");
});

/** The likes group documents no `direction` parameter, so none is offered. */
Deno.test("like-list: offers no sort direction, because Vimeo documents none here", () => {
  const keys = (likeList.params ?? []).map((p) => p.key);
  assert(!keys.includes("direction"));
  assertEquals(likeList.type, "search");
});
