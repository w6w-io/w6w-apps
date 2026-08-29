import { assertEquals } from "@std/assert";
import attachmentDelete from "../../actions/attachment-delete.ts";
import { mockWrikeCtx, pathOf } from "../_helpers.ts";

Deno.test("attachment-delete: DELETEs /attachments/{attachmentId}", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: {} }]);
  const out = await attachmentDelete.execute({ attachmentId: "A1" }, ctx) as { status: number };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v4/attachments/A1");
  assertEquals(out.status, 200);
});
