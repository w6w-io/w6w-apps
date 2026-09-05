import { assertEquals } from "@std/assert";
import updateUser from "../../actions/update-user.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("update-user: POST /users, only provided fields sent", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await updateUser.execute({ email: "a@b.com", bio: "New bio" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v0/users");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com", bio: "New bio" });
});

Deno.test("update-user: completedLessonID becomes a one-item completedLessons array", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await updateUser.execute({ email: "a@b.com", completedLessonID: "l1" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.completedLessons, [{ lessonID: "l1" }]);
});

Deno.test("update-user: is idempotent — a retry overwrites to the same end state", () => {
  assertEquals(updateUser.idempotent, true);
});
