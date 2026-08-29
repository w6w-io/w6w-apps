import { assertEquals } from "@std/assert";
import usersGet from "../../actions/users-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("users-get: GETs /users/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
  await usersGet.execute({ userId: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/users/1");
});

Deno.test("users-get: accepts the literal 'me'", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
  await usersGet.execute({ userId: "me" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/users/me");
});
