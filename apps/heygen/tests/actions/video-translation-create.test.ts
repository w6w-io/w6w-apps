import { assert, assertEquals, assertRejects } from "@std/assert";
import videoTranslationCreate from "../../actions/video-translation-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("video-translation-create: builds a url-sourced request with parsed target languages", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ video_translation_ids: ["vt1", "vt2"] }) },
  ]);
  const out = await videoTranslationCreate.execute(
    { videoUrl: "https://example.com/v.mp4", outputLanguages: "Spanish (Spain), French" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v3/video-translations");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.video, { type: "url", url: "https://example.com/v.mp4" });
  assertEquals(body.output_languages, ["Spanish (Spain)", "French"]);
  assertEquals(out, { video_translation_ids: ["vt1", "vt2"] });
});

Deno.test("video-translation-create: an asset-id source builds an asset_id reference", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ video_translation_ids: ["vt1"] }) }]);
  await videoTranslationCreate.execute(
    { videoAssetId: "asset_1", outputLanguages: "English" },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.video, { type: "asset_id", asset_id: "asset_1" });
});

Deno.test("video-translation-create: a custom dubbing audio source is passed through the same way", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ video_translation_ids: ["vt1"] }) }]);
  await videoTranslationCreate.execute(
    {
      videoUrl: "https://example.com/v.mp4",
      outputLanguages: "English",
      audioUrl: "https://example.com/a.mp3",
    },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.audio, { type: "url", url: "https://example.com/a.mp3" });
});

Deno.test("video-translation-create: neither videoUrl nor videoAssetId is rejected client-side", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await videoTranslationCreate.execute({ outputLanguages: "English" }, ctx),
    Error,
    "exactly one of `videoUrl` or `videoAssetId`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("video-translation-create: both videoUrl and videoAssetId is rejected client-side", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () =>
      await videoTranslationCreate.execute(
        { videoUrl: "https://x", videoAssetId: "a1", outputLanguages: "English" },
        ctx,
      ),
    Error,
    "exactly one of `videoUrl` or `videoAssetId`",
  );
});

Deno.test("video-translation-create: an empty outputLanguages is rejected client-side", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () =>
      await videoTranslationCreate.execute({ videoUrl: "https://x", outputLanguages: "" }, ctx),
    Error,
    "at least one",
  );
});

Deno.test("video-translation-create: the output declares the plural, per-language id shape", () => {
  const out = videoTranslationCreate.output;
  assert(Array.isArray(out));
  assert(out.some((o) => o.key === "video_translation_ids"));
});
