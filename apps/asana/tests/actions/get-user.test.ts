import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-user.ts";

Deno.test("get-user: GETs /users/{userId} and returns whole envelope", async () => {
  const body = { data: { gid: "u-1", name: "Ada" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute({ userId: "u-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/users/u-1");
  assertEquals(out, body);
});

Deno.test("get-user: accepts the `me` keyword", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ userId: "me" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/users/me");
});
