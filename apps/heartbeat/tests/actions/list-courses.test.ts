import { assertEquals } from "@std/assert";
import listCourses from "../../actions/list-courses.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-courses: GET /courses, wrapped under `courses`", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "co1", name: "Onboarding" }] }]);
  const out = await listCourses.execute({}, ctx) as { courses: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v0/courses");
  assertEquals(out.courses.length, 1);
});
