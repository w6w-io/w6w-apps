import { assertEquals } from "@std/assert";
import courseEnrollmentsList from "../../actions/course-enrollments-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("course-enrollments-list: paths by course ID and passes through the sort direction", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("enrollments", []) }]);
  await courseEnrollmentsList.execute({ courseId: 7, sortDirection: "desc" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/courses/7/enrollments");
  assertEquals(queryOf(calls[0].url), { sort_direction: "desc" });
});
