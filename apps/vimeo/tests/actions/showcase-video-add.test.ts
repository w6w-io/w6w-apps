import { assertEquals, assertRejects } from "@std/assert";
import showcaseVideoAdd from "../../actions/showcase-video-add.ts";
import { mockCtx, url } from "../_helpers.ts";

Deno.test("showcase-video-add: PUTs the single-video endpoint with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await showcaseVideoAdd.execute(
    { showcaseId: "/showcases/3706071", videoIds: "258684937" },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(url(calls[0]).pathname, "/me/albums/3706071/videos/258684937");
  assertEquals(calls[0].body, null);
  assertEquals(out, { added: true, showcaseId: "3706071", videoIds: ["258684937"] });
});

/**
 * The load-bearing case. Vimeo's plural endpoint is `replace_videos_in_showcase`
 * — it REPLACES the showcase's contents. Routing "add these two" to it would
 * silently delete everything else, so this action loops the additive endpoint
 * instead. If someone "optimises" it into one bulk call, this fails.
 */
Deno.test("showcase-video-add: several videos are several additive requests, never a replace", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }, { status: 204 }]);
  const out = await showcaseVideoAdd.execute(
    { showcaseId: "3706071", videoIds: "1, /videos/2" },
    ctx,
  );
  assertEquals(calls.length, 2);
  assertEquals(url(calls[0]).pathname, "/me/albums/3706071/videos/1");
  assertEquals(url(calls[1]).pathname, "/me/albums/3706071/videos/2");
  for (const call of calls) {
    assertEquals(call.method, "PUT");
    // A body would mean the collection endpoint, which replaces rather than adds.
    assertEquals(call.body, null);
    assertEquals(url(call).pathname.endsWith("/videos"), false);
  }
  assertEquals(out.videoIds, ["1", "2"]);
});

Deno.test("showcase-video-add: a blank video list is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await showcaseVideoAdd.execute({ showcaseId: "1", videoIds: "" }, ctx),
    Error,
    "Video IDs is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("showcase-video-add: is a convergent perform", () => {
  assertEquals(showcaseVideoAdd.type, "perform");
  assertEquals(showcaseVideoAdd.idempotent, true);
});
