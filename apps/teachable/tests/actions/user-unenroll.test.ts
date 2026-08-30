import { assertEquals } from "@std/assert";
import userUnenroll from "../../actions/user-unenroll.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-unenroll: posts the user/course pair and returns the 204 status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await userUnenroll.execute({ userId: 1, courseId: 2 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/unenroll");
  assertEquals(JSON.parse(calls[0].body!), { user_id: 1, course_id: 2 });
  assertEquals(out, { status: 204 });
});

Deno.test("user-unenroll: is declared idempotent", () => {
  assertEquals(userUnenroll.idempotent, true);
});
