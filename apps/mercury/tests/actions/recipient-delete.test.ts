import { assertEquals } from "@std/assert";
import recipientDelete from "../../actions/recipient-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("recipient-delete: DELETEs /recipient/{recipientId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await recipientDelete.execute({ recipientId: "rec_1" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(pathOf(calls[0].url), "/api/v1/recipient/rec_1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.deleted, true);
});

Deno.test("recipient-delete: declares idempotent true", () => {
  assertEquals(recipientDelete.idempotent, true);
});
