import { assertEquals } from "@std/assert";
import sessionTerminate from "../../actions/session-terminate.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("session-terminate: DELETEs the session and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await sessionTerminate.execute({ sessionId: "s1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v1/sessions/s1");
  assertEquals(out, { success: true, sessionId: "s1" });
});

/** The vendor's own docs: "If a given session id does not exist ... it is ignored." */
Deno.test("session-terminate: is declared idempotent", () => {
  assertEquals(sessionTerminate.idempotent, true);
});
