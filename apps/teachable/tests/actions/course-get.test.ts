import { assertEquals } from "@std/assert";
import courseGet from "../../actions/course-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("course-get: fetches the course by ID", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("course", { id: 42, name: "Intro" }) }]);
  const out = await courseGet.execute({ courseId: 42 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/courses/42");
  assertEquals((out as { course: { id: number } }).course.id, 42);
});
