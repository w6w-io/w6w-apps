import { assertEquals } from "@std/assert";
import sessionArchive from "../../actions/session-archive.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("session-archive: POSTs to /sessions/{id}/archive", async () => {
  const { ctx, calls } = mockCtx([{
    body: { session_id: "devin-1", status: "exit", is_archived: true },
  }]);
  const out = await sessionArchive.execute({ devinId: "devin-1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/sessions/devin-1/archive`);
  assertEquals(calls[0].body, null);
  assertEquals(out.is_archived, true);
});

Deno.test("session-archive: is marked idempotent — retrying lands on the same archived state", () => {
  assertEquals(sessionArchive.idempotent, true);
});
