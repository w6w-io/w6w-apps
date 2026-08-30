import { assertEquals } from "@std/assert";
import respondentUpdate from "../../actions/respondent-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("respondent-update: PATCHes /respondents/{respondentId} with only the set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1", email: "new@example.com" } }]);
  await respondentUpdate.execute({ respondentId: "r1", email: "new@example.com" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/respondents/r1");
  assertEquals(JSON.parse(calls[0].body!), { email: "new@example.com" });
});
