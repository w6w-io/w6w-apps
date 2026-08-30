import { assertEquals } from "@std/assert";
import questionGet from "../../actions/question-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("question-get: GETs /questions/{questionId} and wraps it as {result}", async () => {
  const { ctx, calls } = mockCtx([{ body: { question_id: "q1", type: "standard" } }]);
  const out = await questionGet.execute({ questionId: "q1" }, ctx) as {
    result: { question_id: string };
  };
  assertEquals(pathOf(calls[0].url), "/questions/q1");
  assertEquals(out.result.question_id, "q1");
});
