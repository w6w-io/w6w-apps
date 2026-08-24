import { assertEquals } from "@std/assert";
import videoTranslationList from "../../actions/video-translation-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("video-translation-list: returns items plus pagination cursor", async () => {
  const { ctx, calls } = mockCtx([
    { body: listEnvelope([{ id: "vt1" }], { has_more: false, next_token: null }) },
  ]);
  const out = await videoTranslationList.execute({ limit: 25 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/video-translations");
  assertEquals(out, { items: [{ id: "vt1" }], hasMore: false, nextToken: null });
});
