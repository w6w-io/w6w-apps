import { assertEquals } from "@std/assert";
import callroutersDelete from "../../actions/callrouters-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("callrouters-delete: DELETEs /callrouters/{id} and returns only the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await callroutersDelete.execute({ callRouterId: "1" }, ctx) as { status: number };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/callrouters/1");
  assertEquals(out.status, 200);
});

Deno.test("callrouters-delete: declared idempotent", () => {
  assertEquals(callroutersDelete.idempotent, true);
});
