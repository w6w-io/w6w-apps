import { assertEquals } from "@std/assert";
import sessionReplace from "../../actions/session-replace.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("session-replace: PUTs the session", async () => {
  const { ctx, calls } = mockCtx([{ body: single("sessions", "s1", { name: "New" }) }]);
  const result = await sessionReplace.execute({ id: "s1", name: "New" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/sessions/s1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(result, { id: "s1", type: "sessions", attributes: { name: "New" } });
});
