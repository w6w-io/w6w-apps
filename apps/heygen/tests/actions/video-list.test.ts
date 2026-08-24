import { assertEquals } from "@std/assert";
import videoList from "../../actions/video-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("video-list: returns items plus pagination cursor", async () => {
  const { ctx, calls } = mockCtx([
    { body: listEnvelope([{ id: "v1" }], { has_more: true, next_token: "cursor1" }) },
  ]);
  const out = await videoList.execute({ limit: 5, folderId: "f1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/videos");
  assertEquals(queryOf(calls[0].url), { limit: "5", folder_id: "f1" });
  assertEquals(out, { items: [{ id: "v1" }], hasMore: true, nextToken: "cursor1" });
});

Deno.test("video-list: an empty page reports no more results", async () => {
  const { ctx } = mockCtx([{ body: listEnvelope([]) }]);
  const out = await videoList.execute({}, ctx);
  assertEquals(out, { items: [], hasMore: false, nextToken: null });
});
