import { assertEquals } from "@std/assert";
import userEnroll from "../../actions/user-enroll.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-enroll: posts the user/course pair and returns the 204 status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await userEnroll.execute({ userId: 1, courseId: 2 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/enroll");
  assertEquals(JSON.parse(calls[0].body!), { user_id: 1, course_id: 2 });
  assertEquals(out, { status: 204 });
});

Deno.test("user-enroll: is declared idempotent", () => {
  assertEquals(userEnroll.idempotent, true);
});
