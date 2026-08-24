import { assertEquals } from "@std/assert";
import userWhoAmI from "../../actions/user-who-am-i.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-who-am-i: calls GET /users/who_am_i.json and unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 1, name: "Jane Doe" }) }]);
  const out = await userWhoAmI.execute({}, ctx) as { name: string };
  assertEquals(pathOf(calls[0].url), "/api/v4/users/who_am_i.json");
  assertEquals(out.name, "Jane Doe");
});
