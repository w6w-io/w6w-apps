import { assertEquals, assertRejects } from "@std/assert";
import userMe from "../../actions/user-me.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-me - GETs /user/api/v1/me with no query and returns the profile", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: 1, name: "Maria Silva", email: "m@x.com" },
  }]);
  const out = await userMe.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/user/api/v1/me");
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out, { id: 1, name: "Maria Silva", email: "m@x.com" });
});

Deno.test("user-me - surfaces invalid_token", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("invalid_token", "Access token is missing or invalid") },
  ]);
  await assertRejects(() => Promise.resolve(userMe.execute({}, ctx)), Error, "invalid_token");
});
