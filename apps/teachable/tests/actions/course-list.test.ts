import { assertEquals } from "@std/assert";
import courseList from "../../actions/course-list.ts";
import { envelope, mockCtx, paginationMeta, pathOf, queryOf } from "../_helpers.ts";

Deno.test("course-list: builds the query from filters and defaults per to 20", async () => {
  const { ctx, calls } = mockCtx([
    { body: { courses: [{ id: 1, name: "A" }], meta: paginationMeta() } },
  ]);
  const out = await courseList.execute({ isPublished: true }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/courses");
  assertEquals(queryOf(calls[0].url), { is_published: "true", per: "20" });
  assertEquals((out as { courses: unknown[] }).courses.length, 1);
});

Deno.test("course-list: an explicit per overrides the default", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("courses", []) }]);
  await courseList.execute({ per: 5, page: 2 }, ctx);

  assertEquals(queryOf(calls[0].url), { per: "5", page: "2" });
});
