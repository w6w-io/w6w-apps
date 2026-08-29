import { assertEquals } from "@std/assert";
import emailThreadMarkRead from "../../actions/email-thread-mark-read.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("email-thread-mark-read: POSTs /emails/threads/{thread_id}/mark-as-read", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await emailThreadMarkRead.execute({ thread_id: "t1" }, ctx) as { success: boolean };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/emails/threads/t1/mark-as-read");
  assertEquals(out.success, true);
});

Deno.test("email-thread-mark-read: is declared idempotent", () => {
  assertEquals(emailThreadMarkRead.idempotent, true);
});
