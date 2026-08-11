import { assertEquals } from "@std/assert";
import videoSearch from "../../actions/video-search.ts";
import { collection, mockCtx, q, url, video } from "../_helpers.ts";

Deno.test("video-search: hits the public /videos endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([video(1)]) }]);
  await videoSearch.execute({ query: "staff picks" }, ctx);
  assertEquals(url(calls[0]).pathname, "/videos");
  assertEquals(q(calls[0], "query"), "staff picks");
});

Deno.test("video-search: forwards the Creative Commons filter, sort and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }]);
  await videoSearch.execute({
    query: "x",
    license: "CC-BY",
    sort: "relevant",
    direction: "desc",
    page: 2,
    perPage: 50,
    fields: "uri",
  }, ctx);
  assertEquals(q(calls[0], "filter"), "CC-BY");
  assertEquals(q(calls[0], "sort"), "relevant");
  assertEquals(q(calls[0], "direction"), "desc");
  assertEquals(q(calls[0], "page"), "2");
  assertEquals(q(calls[0], "per_page"), "50");
  assertEquals(q(calls[0], "fields"), "uri");
});

/**
 * Vimeo rejects the combination outright (400, error code 2101): "Querying,
 * filtering, and sorting aren't supported when using this field."
 */
Deno.test("video-search: uris suppresses query, filter and sort rather than 400ing", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }]);
  await videoSearch.execute({
    uris: "/videos/1, /videos/2",
    query: "ignored",
    license: "CC",
    sort: "date",
    direction: "asc",
    page: 2,
  }, ctx);
  assertEquals(q(calls[0], "uris"), "/videos/1,/videos/2");
  assertEquals(q(calls[0], "query"), null);
  assertEquals(q(calls[0], "filter"), null);
  assertEquals(q(calls[0], "sort"), null);
  assertEquals(q(calls[0], "direction"), null);
  // Pagination is not on the forbidden list.
  assertEquals(q(calls[0], "page"), "2");
});

Deno.test("video-search: links suppresses the same parameters as uris", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }]);
  await videoSearch.execute({ links: "https://vimeo.com/1", query: "ignored", sort: "date" }, ctx);
  assertEquals(q(calls[0], "links"), "https://vimeo.com/1");
  assertEquals(q(calls[0], "query"), null);
  assertEquals(q(calls[0], "sort"), null);
});

Deno.test("video-search: is a search action", () => {
  assertEquals(videoSearch.type, "search");
});
