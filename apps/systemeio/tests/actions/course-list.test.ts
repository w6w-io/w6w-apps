import { assertEquals } from "@std/assert";
import courseList from "../../actions/course-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("course-list: hits /api/school/courses with the given filters", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, name: "Intro" }]) }]);
  await courseList.execute({ active: true, query: "Intro" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/school/courses");
  assertEquals(queryOf(calls[0].url), { active: "true", query: "Intro" });
});
