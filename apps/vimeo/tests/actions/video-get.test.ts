import { assertEquals } from "@std/assert";
import videoGet from "../../actions/video-get.ts";
import { mockCtx, q, url, video } from "../_helpers.ts";

Deno.test("video-get: fetches /videos/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: video(258684937) }]);
  const out = await videoGet.execute({ videoId: "258684937" }, ctx) as { uri: string };
  assertEquals(url(calls[0]).pathname, "/videos/258684937");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.uri, "/videos/258684937");
});

/** A workflow naturally forwards the previous step's `uri`; it must just work. */
Deno.test("video-get: accepts a /videos/{id} URI as well as a bare id", async () => {
  const { ctx, calls } = mockCtx([{ body: video(1) }]);
  await videoGet.execute({ videoId: "/videos/258684937" }, ctx);
  assertEquals(url(calls[0]).pathname, "/videos/258684937");
});

Deno.test("video-get: forwards time_links and fields", async () => {
  const { ctx, calls } = mockCtx([{ body: video(1) }]);
  await videoGet.execute({ videoId: "1", timeLinks: true, fields: "uri, name" }, ctx);
  assertEquals(q(calls[0], "time_links"), "true");
  assertEquals(q(calls[0], "fields"), "uri,name");
});

Deno.test("video-get: sends no fields filter when none was asked for", async () => {
  const { ctx, calls } = mockCtx([{ body: video(1) }]);
  await videoGet.execute({ videoId: "1" }, ctx);
  assertEquals(q(calls[0], "fields"), null);
  assertEquals(q(calls[0], "time_links"), null);
});

Deno.test("video-get: is a read action", () => {
  assertEquals(videoGet.type, "read");
});
