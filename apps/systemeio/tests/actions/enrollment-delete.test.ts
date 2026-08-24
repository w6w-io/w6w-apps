import { assertEquals } from "@std/assert";
import enrollmentDelete from "../../actions/enrollment-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("enrollment-delete: DELETEs /api/school/enrollments/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await enrollmentDelete.execute({ id: "1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/school/enrollments/1");
  assertEquals(out, { status: 204 });
});
