import { assertEquals } from "@std/assert";
import videoTranslationGet from "../../actions/video-translation-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("video-translation-get: fetches by id and returns the job unwrapped", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "vt1", status: "completed" }) }]);
  const out = await videoTranslationGet.execute({ videoTranslationId: "vt1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/video-translations/vt1");
  assertEquals(out, { id: "vt1", status: "completed" });
});
