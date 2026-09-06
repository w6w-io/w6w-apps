import { assertEquals } from "@std/assert";
import sessionPersonGet from "../../actions/session-person-get.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("session-person-get: GETs /sessions/{sessionId}/people/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: single("people", "p1", { email: "a@b.com" }) }]);
  const result = await sessionPersonGet.execute({ sessionId: "s1", id: "p1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/sessions/s1/people/p1");
  assertEquals(result, { id: "p1", type: "people", attributes: { email: "a@b.com" } });
});
