import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { hnRequest, listStoryIds } from "../../lib/client.ts";

Deno.test("hnRequest: GETs against the v0 base URL and returns the parsed JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, type: "story" } }]);
  const out = await hnRequest<{ id: number; type: string }>(ctx, "/item/1.json");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://hacker-news.firebaseio.com/v0/item/1.json");
  assertEquals(out.id, 1);
});

Deno.test("hnRequest: a 200 with an empty body parses as null", async () => {
  const { ctx } = mockCtx([{ body: undefined }]);
  const out = await hnRequest<unknown>(ctx, "/item/999999999999.json");
  assertEquals(out, null);
});

Deno.test("hnRequest: a bare 200 literal null body parses as null", async () => {
  const { ctx } = mockCtx([{ body: "null" }]);
  const out = await hnRequest<unknown>(ctx, "/user/does-not-exist.json");
  assertEquals(out, null);
});

Deno.test("hnRequest: throws with the HTTP status on a non-OK response", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  await assertRejects(() => hnRequest(ctx, "/item/1.json"), Error, "500");
});

Deno.test("listStoryIds: returns the bare array of ids", async () => {
  const { ctx, calls } = mockCtx([{ body: [1, 2, 3] }]);
  const ids = await listStoryIds(ctx, "/topstories.json");
  assertEquals(calls[0].url, "https://hacker-news.firebaseio.com/v0/topstories.json");
  assertEquals(ids, [1, 2, 3]);
});

Deno.test("listStoryIds: an empty/null body becomes an empty array", async () => {
  const { ctx } = mockCtx([{ body: "null" }]);
  const ids = await listStoryIds(ctx, "/topstories.json");
  assertEquals(ids, []);
});
