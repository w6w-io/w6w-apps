import { assertEquals } from "@std/assert";
import sessionUpdate from "../../actions/session-update.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("session-update: PATCHes only the set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: single("sessions", "s1", { name: "New" }) }]);
  const result = await sessionUpdate.execute({ id: "s1", name: "New" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/sessions/s1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { type: "sessions", attributes: { name: "New" } },
  });
  assertEquals(result, { id: "s1", type: "sessions", attributes: { name: "New" } });
});
