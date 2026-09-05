import { assertEquals } from "@std/assert";
import inboxDelete from "../../actions/inbox-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("inbox-delete: sends DELETE /inboxes/{id} and reports { deleted: true }", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await inboxDelete.execute({ inboxId: "in_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/inboxes/in_1");
  assertEquals(result, { deleted: true });
});

Deno.test("inbox-delete: marked idempotent — a retry has nothing left to delete twice", () => {
  assertEquals(inboxDelete.idempotent, true);
  assertEquals(inboxDelete.type, "perform");
});
