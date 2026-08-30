import { assertEquals, assertRejects } from "@std/assert";
import lectureMarkComplete from "../../actions/lecture-mark-complete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lecture-mark-complete: posts the user_id and returns the 204 status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await lectureMarkComplete.execute({ courseId: 1, lectureId: 2, userId: 9 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/courses/1/lectures/2/mark_complete");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { user_id: 9 });
  assertEquals(out, { status: 204 });
});

Deno.test("lecture-mark-complete: is declared idempotent", () => {
  assertEquals(lectureMarkComplete.idempotent, true);
});

/** A retry of an already-completed lecture is a documented 409, surfaced as an error. */
Deno.test("lecture-mark-complete: an already-completed lecture surfaces the 409, not a silent success", async () => {
  const { ctx } = mockCtx([{ status: 409, body: errorBody("Lecture already marked complete") }]);
  await assertRejects(
    () =>
      Promise.resolve(lectureMarkComplete.execute({ courseId: 1, lectureId: 2, userId: 9 }, ctx)),
    Error,
    "already marked complete",
  );
});
