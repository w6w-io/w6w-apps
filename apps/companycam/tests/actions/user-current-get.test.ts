import { assertEquals } from "@std/assert";
import userCurrentGet from "../../actions/user-current-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-current-get: reads the connection's own user with no params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "9", email_address: "shawn@psych.co" } }]);
  const user = await userCurrentGet.execute({}, ctx) as { id: string };
  assertEquals(pathOf(calls[0].url), "/v2/users/current");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers.authorization, undefined, "the host signs, the action does not");
  assertEquals(user.id, "9");
  assertEquals(userCurrentGet.params, []);
});
