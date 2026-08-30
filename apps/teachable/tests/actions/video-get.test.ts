import { assertEquals } from "@std/assert";
import videoGet from "../../actions/video-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("video-get: paths by course/lecture/video ID and forwards the optional watching user", async () => {
  const { ctx, calls } = mockCtx([{ body: { video: { id: 4 } } }]);
  await videoGet.execute({ courseId: 1, lectureId: 2, videoId: 4, userId: 9 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/courses/1/lectures/2/videos/4");
  assertEquals(queryOf(calls[0].url), { user_id: "9" });
});

Deno.test("video-get: omits user_id from the query when not given", async () => {
  const { ctx, calls } = mockCtx([{ body: { video: { id: 4 } } }]);
  await videoGet.execute({ courseId: 1, lectureId: 2, videoId: 4 }, ctx);

  assertEquals(queryOf(calls[0].url), {});
});
