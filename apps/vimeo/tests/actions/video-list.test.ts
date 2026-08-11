import { assert, assertEquals } from "@std/assert";
import videoList from "../../actions/video-list.ts";
import { collection, mockCtx, q, url, video } from "../_helpers.ts";

Deno.test("video-list: hits the /me alias so the numeric user id is never needed", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([video(1)]) }]);
  const out = await videoList.execute({}, ctx);
  assertEquals(url(calls[0]).pathname, "/me/videos");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.total, 1);
});

Deno.test("video-list: forwards every documented filter and pagination parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }]);
  await videoList.execute({
    query: "stop motion",
    queryFields: ["title", "tags"],
    filterTag: "abc, xyz",
    filterTagAllOf: "a",
    filterTagExclude: "b",
    sort: "plays",
    direction: "desc",
    page: 3,
    perPage: 100,
    fields: "uri,name",
  }, ctx);
  assertEquals(q(calls[0], "query"), "stop motion");
  assertEquals(q(calls[0], "query_fields"), "title,tags");
  assertEquals(q(calls[0], "filter_tag"), "abc,xyz");
  assertEquals(q(calls[0], "filter_tag_all_of"), "a");
  assertEquals(q(calls[0], "filter_tag_exclude"), "b");
  assertEquals(q(calls[0], "sort"), "plays");
  assertEquals(q(calls[0], "direction"), "desc");
  assertEquals(q(calls[0], "page"), "3");
  assertEquals(q(calls[0], "per_page"), "100");
  assertEquals(q(calls[0], "fields"), "uri,name");
});

/**
 * Vimeo needs `filter=embeddable` AND `filter_embeddable=<bool>` together;
 * either alone is a 400.
 */
Deno.test("video-list: the embeddable filter is sent as the documented pair", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }, { body: collection([]) }]);
  await videoList.execute({ filterEmbeddable: true }, ctx);
  assertEquals(q(calls[0], "filter"), "embeddable");
  assertEquals(q(calls[0], "filter_embeddable"), "true");

  // `false` is a real request (non-embeddable only), not an absent one.
  await videoList.execute({ filterEmbeddable: false }, ctx);
  assertEquals(q(calls[1], "filter"), "embeddable");
  assertEquals(q(calls[1], "filter_embeddable"), "false");
});

Deno.test("video-list: neither half of the pair is sent when the boolean is unset", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }]);
  await videoList.execute({ sort: "date" }, ctx);
  assertEquals(q(calls[0], "filter"), null);
  assertEquals(q(calls[0], "filter_embeddable"), null);
});

/** Vimeo documents containing_uri as unavailable when paired with a query. */
Deno.test("video-list: containing_uri is dropped when a search query is also set", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }, { body: collection([]) }]);
  await videoList.execute({ containingUri: "/videos/1", query: "x" }, ctx);
  assertEquals(q(calls[0], "containing_uri"), null);
  assertEquals(q(calls[0], "query"), "x");

  await videoList.execute({ containingUri: "/videos/1" }, ctx);
  assertEquals(q(calls[1], "containing_uri"), "/videos/1");
});

Deno.test("video-list: is a search action that returns the whole collection envelope", () => {
  assertEquals(videoList.type, "search");
  const keys = (videoList.output as Array<{ key: string }>).map((o) => o.key);
  assert(keys.includes("data") && keys.includes("total") && keys.includes("paging"));
});
