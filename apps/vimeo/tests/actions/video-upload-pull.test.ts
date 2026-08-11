import { assert, assertEquals } from "@std/assert";
import videoUploadPull from "../../actions/video-upload-pull.ts";
import { jsonBody, mockCtx, q, url } from "../_helpers.ts";

const created = {
  uri: "/videos/258684937",
  name: "clip.mp4",
  status: "uploading",
  upload: { approach: "pull", status: "in_progress", link: "https://example.com/clip.mp4" },
};

Deno.test("video-upload-pull: POSTs /me/videos with the pull approach", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: created }]);
  const out = await videoUploadPull.execute(
    { link: "https://example.com/clip.mp4" },
    ctx,
  ) as typeof created;
  assertEquals(calls[0].method, "POST");
  assertEquals(url(calls[0]).pathname, "/me/videos");
  assertEquals(jsonBody(calls[0]), {
    upload: { approach: "pull", link: "https://example.com/clip.mp4" },
  });
  assertEquals(out.upload.approach, "pull");
});

/**
 * `upload.approach`, not `type`: Vimeo returns 400 with error code 3116 for the
 * old `type` payload parameter from API version 3.4 on.
 */
Deno.test("video-upload-pull: never sends the retired `type` payload parameter", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: created }]);
  await videoUploadPull.execute({ link: "https://example.com/clip.mp4" }, ctx);
  const body = jsonBody(calls[0]);
  assertEquals(body.type, undefined);
  assertEquals((body.upload as Record<string, unknown>).approach, "pull");
});

Deno.test("video-upload-pull: nests metadata alongside the upload block", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: created }]);
  await videoUploadPull.execute({
    link: "https://example.com/clip.mp4",
    size: 800000000,
    name: "Holiday reel",
    description: "The good bits",
    privacyView: "password",
    password: "hunter1",
    privacyEmbed: "whitelist",
    privacyDownload: false,
    privacyComments: "nobody",
  }, ctx);
  assertEquals(jsonBody(calls[0]), {
    upload: { approach: "pull", link: "https://example.com/clip.mp4", size: 800000000 },
    name: "Holiday reel",
    description: "The good bits",
    privacy: { view: "password", embed: "whitelist", download: false, comments: "nobody" },
    password: "hunter1",
  });
});

Deno.test("video-upload-pull: fields goes on the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: created }]);
  await videoUploadPull.execute(
    { link: "https://example.com/clip.mp4", fields: "uri,status,upload" },
    ctx,
  );
  assertEquals(q(calls[0], "fields"), "uri,status,upload");
});

Deno.test("video-upload-pull: logs that it started without logging the link", async () => {
  const { ctx, logs } = mockCtx([{ status: 201, body: created }]);
  await videoUploadPull.execute({ link: "https://example.com/secret-path/clip.mp4" }, ctx);
  assertEquals(logs.length, 1);
  assert(!JSON.stringify(logs).includes("secret-path"), "the log echoed the source URL");
});

/**
 * Every call creates a new video and Vimeo has no idempotency key here, so a
 * runtime retry would produce a second video.
 */
Deno.test("video-upload-pull: is explicitly not idempotent", () => {
  assertEquals(videoUploadPull.type, "perform");
  assertEquals(videoUploadPull.idempotent, false);
});

/** The 201-for-a-bad-link trap: `status` and `upload` are how it surfaces. */
Deno.test("video-upload-pull: declares status and upload as outputs", () => {
  const keys = (videoUploadPull.output as Array<{ key: string }>).map((o) => o.key);
  assert(keys.includes("status"), "status is how a non-video link shows up");
  assert(keys.includes("upload"));
});
