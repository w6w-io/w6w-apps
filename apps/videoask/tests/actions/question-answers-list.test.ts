import { assertEquals } from "@std/assert";
import questionAnswersList from "../../actions/question-answers-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * This is the one list endpoint that answers a bare array rather than the
 * usual {results, next, previous} envelope — the assertion that matters here
 * is that the action returns `{answers: [...]}` from that bare array, not
 * `{answers: undefined}` from mis-reading `body.results`.
 */
Deno.test("question-answers-list: reads a bare array, not a {results} envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ answer_id: "a1" }, { answer_id: "a2" }] }]);
  const out = await questionAnswersList.execute(
    { questionId: "q1", limit: 20, offset: 0 },
    ctx,
  ) as {
    answers: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/questions/q1/answers");
  assertEquals(queryOf(calls[0].url), { limit: "20", offset: "0" });
  assertEquals(out.answers.length, 2);
});
