import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-user.ts";

Deno.test("get-user: GETs /users/{id}", async () => {
  const body = { object: "user", id: "user-1", type: "person" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute({ userId: "user-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/users/user-1");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
