import { assertEquals } from "@std/assert";
import questionDelete from "../../actions/question-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("question-delete: DELETEs /questions/{questionId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await questionDelete.execute({ questionId: "q1" }, ctx) as { status: number };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/questions/q1");
  assertEquals(out.status, 200);
});
