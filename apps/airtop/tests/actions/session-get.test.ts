import { assertEquals } from "@std/assert";
import sessionGet from "../../actions/session-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("session-get: reads a session by id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "s1", status: "running" }) }]);
  const out = await sessionGet.execute({ sessionId: "s1" }, ctx) as { id: string; status: string };

  assertEquals(pathOf(calls[0].url), "/api/v1/sessions/s1");
  assertEquals(out.status, "running");
});
