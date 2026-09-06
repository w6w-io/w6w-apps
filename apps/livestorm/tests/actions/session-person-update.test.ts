import { assertEquals } from "@std/assert";
import sessionPersonUpdate from "../../actions/session-person-update.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("session-person-update: PATCHes with fields as {id, value} pairs", async () => {
  const { ctx, calls } = mockCtx([{ body: single("people", "p1") }]);
  await sessionPersonUpdate.execute({
    sessionId: "s1",
    id: "p1",
    fields: { first_name: "Jean" },
    utmSource: "newsletter",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/sessions/s1/people/p1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), {
    data: {
      type: "people",
      attributes: { fields: [{ id: "first_name", value: "Jean" }], utm_source: "newsletter" },
    },
  });
});
