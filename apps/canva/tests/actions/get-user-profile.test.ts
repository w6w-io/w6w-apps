import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-user-profile.ts";

Deno.test("get-user-profile: GETs /rest/v1/users/me/profile and unwraps profile", async () => {
  const { ctx, calls } = mockCtx([{ body: { profile: { display_name: "Jane Doe" } } }]);
  const result = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/users/me/profile");
  assertEquals(result, { display_name: "Jane Doe" });
});
