import { assertEquals } from "@std/assert";
import sessionTerminate from "../../actions/session-terminate.ts";
import { API_ROOT, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("session-terminate: DELETEs /sessions/{id} with no query by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { session_id: "devin-1", status: "exit" } }]);
  await sessionTerminate.execute({ devinId: "devin-1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/sessions/devin-1`);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("session-terminate: archive=true is sent when the caller opts to preserve the session", async () => {
  const { ctx, calls } = mockCtx([{
    body: { session_id: "devin-1", status: "exit", is_archived: true },
  }]);
  await sessionTerminate.execute({ devinId: "devin-1", archive: true }, ctx);
  assertEquals(queryOf(calls[0].url), { archive: "true" });
});

Deno.test("session-terminate: is marked idempotent — retrying lands on the same terminated state", () => {
  assertEquals(sessionTerminate.idempotent, true);
});
