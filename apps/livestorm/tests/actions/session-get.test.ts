import { assertEquals } from "@std/assert";
import sessionGet from "../../actions/session-get.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("session-get: GETs /sessions/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: single("sessions", "s1", { name: "S1" }) }]);
  const result = await sessionGet.execute({ id: "s1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/sessions/s1");
  assertEquals(result, { id: "s1", type: "sessions", attributes: { name: "S1" } });
});
