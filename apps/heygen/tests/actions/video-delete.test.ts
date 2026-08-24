import { assertEquals } from "@std/assert";
import videoDelete from "../../actions/video-delete.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("video-delete: sends DELETE to the video's own path", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "v1", deleted: true }) }]);
  const out = await videoDelete.execute({ videoId: "v1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v3/videos/v1");
  assertEquals(out, { id: "v1", deleted: true });
});

Deno.test("video-delete: is marked idempotent — retrying a delete is safe", () => {
  assertEquals(videoDelete.idempotent, true);
});
