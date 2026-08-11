import { assert, assertEquals, assertRejects } from "@std/assert";
import showcaseVideoReplace from "../../actions/showcase-video-replace.ts";
import { collection, jsonBody, mockCtx, q, url, video } from "../_helpers.ts";

/**
 * The body field is `videos` (not `uris`, as the folder bulk endpoints spell the
 * same idea) and it takes full URIs, not ids.
 */
Deno.test("showcase-video-replace: PUTs the collection with a videos URI list", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: collection([video(1), video(2)]) }]);
  await showcaseVideoReplace.execute(
    { showcaseId: "/showcases/3706071", videoIds: "1, /videos/2" },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(url(calls[0]).pathname, "/me/albums/3706071/videos");
  assertEquals(jsonBody(calls[0]), { videos: "/videos/1,/videos/2" });
  assertEquals(jsonBody(calls[0]).uris, undefined);
});

Deno.test("showcase-video-replace: fields goes on the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: collection([]) }]);
  await showcaseVideoReplace.execute({ showcaseId: "1", videoIds: "1", fields: "uri" }, ctx);
  assertEquals(q(calls[0], "fields"), "uri");
});

Deno.test("showcase-video-replace: a blank video list is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await showcaseVideoReplace.execute({ showcaseId: "1", videoIds: "," }, ctx),
    Error,
    "Video IDs is required",
  );
  assertEquals(calls.length, 0);
});

/** The name and description must say "replace" — that is the whole safety story. */
Deno.test("showcase-video-replace: says it replaces, so nobody reaches it meaning add", () => {
  assert(showcaseVideoReplace.key.includes("replace"));
  assert(/removed/i.test(showcaseVideoReplace.description ?? ""));
  assertEquals(showcaseVideoReplace.type, "perform");
  assertEquals(showcaseVideoReplace.idempotent, true);
});
