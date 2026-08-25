import { assertEquals } from "@std/assert";
import messageDelete from "../../actions/message-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("message-delete: DELETEs the singular, unversioned /api/message/{handle}", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK" } }]);
  await messageDelete.execute({ messageHandle: "m1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  // NOT /api/v2/messages/m1 — this is the one endpoint with no /v2 form.
  assertEquals(pathOf(calls[0].url), "/api/message/m1");
});
