import { assert, assertEquals } from "@std/assert";
import showcaseVideoList from "../../actions/showcase-video-list.ts";
import { collection, mockCtx, q, url, video } from "../_helpers.ts";

Deno.test("showcase-video-list: hits /me/albums/{id}/videos", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([video(1)]) }]);
  await showcaseVideoList.execute({ showcaseId: "3706071" }, ctx);
  assertEquals(url(calls[0]).pathname, "/me/albums/3706071/videos");
});

/** `manual` is the showcase's arranged order and exists only on this endpoint. */
Deno.test("showcase-video-list: offers the showcase-only manual sort", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }]);
  const sort = (showcaseVideoList.params ?? []).find((p) => p.key === "sort");
  const values = (sort?.options as Array<{ value: string }>).map((o) => o.value);
  assert(values.includes("manual"));
  await showcaseVideoList.execute({ showcaseId: "1", sort: "manual" }, ctx);
  assertEquals(q(calls[0], "sort"), "manual");
});

Deno.test("showcase-video-list: forwards the password, weak search and embeddable pair", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }]);
  await showcaseVideoList.execute({
    showcaseId: "1",
    query: "reel",
    password: "hunter1",
    weakSearch: true,
    filterEmbeddable: true,
    containingUri: "/videos/1",
    direction: "asc",
    page: 2,
    perPage: 50,
    fields: "uri",
  }, ctx);
  assertEquals(q(calls[0], "query"), "reel");
  assertEquals(q(calls[0], "password"), "hunter1");
  assertEquals(q(calls[0], "weak_search"), "true");
  assertEquals(q(calls[0], "filter"), "embeddable");
  assertEquals(q(calls[0], "filter_embeddable"), "true");
  assertEquals(q(calls[0], "containing_uri"), "/videos/1");
  assertEquals(q(calls[0], "direction"), "asc");
  assertEquals(q(calls[0], "page"), "2");
  assertEquals(q(calls[0], "per_page"), "50");
  assertEquals(q(calls[0], "fields"), "uri");
});

Deno.test("showcase-video-list: neither half of the embeddable pair is sent when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }]);
  await showcaseVideoList.execute({ showcaseId: "1" }, ctx);
  assertEquals(q(calls[0], "filter"), null);
  assertEquals(q(calls[0], "filter_embeddable"), null);
});

/** It is a password, even though it travels as a query parameter. */
Deno.test("showcase-video-list: the showcase password param is a masked secret", () => {
  const password = (showcaseVideoList.params ?? []).find((p) => p.key === "password");
  assertEquals(password?.type, "secret");
});

Deno.test("showcase-video-list: is a search action", () => {
  assertEquals(showcaseVideoList.type, "search");
});
