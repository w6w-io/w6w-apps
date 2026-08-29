import { assertEquals } from "@std/assert";
import commentCreate from "../../actions/comment-create.ts";
import { envelope, mockWrikeCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("comment-create: POSTs to /tasks/{taskId}/comments", async () => {
  const { ctx, calls } = mockWrikeCtx([
    { status: 200, body: envelope([{ id: "C1", text: "hi" }]) },
  ]);
  const out = await commentCreate.execute({ taskId: "T1", text: "hi" }, ctx) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v4/tasks/T1/comments");
  assertEquals(queryOf(calls[0].url), { text: "hi" });
  assertEquals(out.id, "C1");
});

Deno.test("comment-create: is declared non-idempotent — a retry posts a duplicate comment", () => {
  assertEquals(commentCreate.idempotent, false);
});
