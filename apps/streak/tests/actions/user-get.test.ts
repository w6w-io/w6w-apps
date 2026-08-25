import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-get: calls GET /users/{userKey}", async () => {
  const { ctx, calls } = mockCtx([{ body: { displayName: "Oscar" } }]);
  await userGet.execute({ userKey: "u1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/users/u1");
});
