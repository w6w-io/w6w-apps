import { assertEquals } from "@std/assert";
import getLesson from "../../actions/get-lesson.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-lesson: GET /lessons/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l1", title: "Welcome" } }]);
  const out = await getLesson.execute({ lessonID: "l1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v0/lessons/l1");
  assertEquals(out.title, "Welcome");
});
