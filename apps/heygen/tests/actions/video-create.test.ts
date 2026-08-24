import { assert, assertEquals, assertRejects } from "@std/assert";
import videoCreate from "../../actions/video-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("video-create: builds an avatar-type body from a script", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ video_id: "v1", status: "waiting", output_format: "mp4" }) },
  ]);
  const out = await videoCreate.execute(
    { avatarId: "lk_1", script: "Hello world", voiceId: "voice_1" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v3/videos");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    type: "avatar",
    avatar_id: "lk_1",
    script: "Hello world",
    voice_id: "voice_1",
  });
  assertEquals(out, { video_id: "v1", status: "waiting", output_format: "mp4" });
});

Deno.test("video-create: an audio source is accepted in place of a script", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ video_id: "v1", status: "waiting" }) }]);
  await videoCreate.execute({ avatarId: "lk_1", audioUrl: "https://example.com/a.mp3" }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.audio_url, "https://example.com/a.mp3");
  assertEquals(body.script, undefined);
});

Deno.test("video-create: neither a script nor an audio source is rejected client-side", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await videoCreate.execute({ avatarId: "lk_1" }, ctx),
    Error,
    "exactly one of `script` or an audio source",
  );
  assertEquals(calls.length, 0, "no request should be made when validation fails");
});

Deno.test("video-create: both a script and an audio source is rejected client-side", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await videoCreate.execute({ avatarId: "lk_1", script: "hi", audioUrl: "https://x" }, ctx),
    Error,
    "exactly one of `script` or an audio source",
  );
  assertEquals(calls.length, 0);
});

Deno.test("video-create: both audioUrl and audioAssetId together is rejected", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () =>
      await videoCreate.execute(
        { avatarId: "lk_1", audioUrl: "https://x", audioAssetId: "asset_1" },
        ctx,
      ),
    Error,
    "only one of `audioUrl` or `audioAssetId`",
  );
});

Deno.test("video-create: optional fields are omitted from the wire body when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ video_id: "v1", status: "waiting" }) }]);
  await videoCreate.execute({ avatarId: "lk_1", script: "hi" }, ctx);

  const body = JSON.parse(calls[0].body!);
  assert(!("resolution" in body));
  assert(!("aspect_ratio" in body));
  assert(!("folder_id" in body));
});

Deno.test("video-create: is not marked idempotent — each call bills and starts a new render", () => {
  assertEquals(videoCreate.idempotent, false);
});
