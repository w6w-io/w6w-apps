import { assertEquals } from "@std/assert";
import sessionDelete from "../../actions/session-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("session-delete: DELETEs /sessions/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const result = await sessionDelete.execute({ id: "s1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/sessions/s1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { status: 204 });
});
