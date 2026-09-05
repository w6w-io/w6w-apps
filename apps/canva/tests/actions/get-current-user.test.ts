import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-current-user.ts";

Deno.test("get-current-user: GETs /rest/v1/users/me and unwraps team_user", async () => {
  const { ctx, calls } = mockCtx([{ body: { team_user: { user_id: "U1", team_id: "T1" } } }]);
  const result = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/users/me");
  assertEquals(result, { user_id: "U1", team_id: "T1" });
});
