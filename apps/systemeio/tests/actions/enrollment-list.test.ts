import { assertEquals } from "@std/assert";
import enrollmentList from "../../actions/enrollment-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("enrollment-list: hits /api/school/enrollments with the given filters", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1 }]) }]);
  await enrollmentList.execute({ course: "5", contact: "42" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/school/enrollments");
  assertEquals(queryOf(calls[0].url), { course: "5", contact: "42" });
});
