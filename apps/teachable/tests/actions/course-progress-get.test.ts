import { assertEquals } from "@std/assert";
import courseProgressGet from "../../actions/course-progress-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("course-progress-get: requires user_id in the query and defaults per to 20", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("course_progress", { id: 1 }) }]);
  await courseProgressGet.execute({ courseId: 3, userId: 9 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/courses/3/progress");
  assertEquals(queryOf(calls[0].url), { user_id: "9", per: "20" });
});
