import { assertEquals } from "@std/assert";
import quizGet from "../../actions/quiz-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("quiz-get: paths by course, lecture and quiz ID", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: 3, name: "Quiz", quiz: { id: 3, questions: [] } },
  }]);
  await quizGet.execute({ courseId: 1, lectureId: 2, quizId: 3 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/courses/1/lectures/2/quizzes/3");
});
