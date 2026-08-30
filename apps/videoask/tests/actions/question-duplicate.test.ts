import { assertEquals } from "@std/assert";
import questionDuplicate from "../../actions/question-duplicate.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("question-duplicate: POSTs to /questions/{questionId}/duplicate with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { question_id: "q2" } }]);
  await questionDuplicate.execute({ questionId: "q1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/questions/q1/duplicate");
  assertEquals(calls[0].body, null);
});
