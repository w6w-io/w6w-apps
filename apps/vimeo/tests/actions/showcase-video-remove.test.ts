import { assertEquals, assertRejects } from "@std/assert";
import showcaseVideoRemove from "../../actions/showcase-video-remove.ts";
import { mockCtx, url } from "../_helpers.ts";

Deno.test("showcase-video-remove: DELETEs the single-video endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await showcaseVideoRemove.execute({ showcaseId: "3706071", videoIds: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url(calls[0]).pathname, "/me/albums/3706071/videos/1");
  assertEquals(out, { removed: true, showcaseId: "3706071", videoIds: ["1"] });
});

/** Vimeo publishes no bulk remove, so several videos are several requests. */
Deno.test("showcase-video-remove: several videos are several requests", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }, { status: 204 }]);
  await showcaseVideoRemove.execute({ showcaseId: "3706071", videoIds: "1,/videos/2" }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(url(calls[0]).pathname, "/me/albums/3706071/videos/1");
  assertEquals(url(calls[1]).pathname, "/me/albums/3706071/videos/2");
});

Deno.test("showcase-video-remove: a blank video list is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await showcaseVideoRemove.execute({ showcaseId: "1", videoIds: " " }, ctx),
    Error,
    "Video IDs is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("showcase-video-remove: is a retry-safe perform", () => {
  assertEquals(showcaseVideoRemove.type, "perform");
  assertEquals(showcaseVideoRemove.idempotent, true);
});
