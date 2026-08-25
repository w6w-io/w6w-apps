import { assertEquals } from "@std/assert";
import userGetCurrent from "../../actions/user-get-current.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-get-current: calls GET /users/me", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "tesla@streak.com" } }]);
  const out = await userGetCurrent.execute({}, ctx) as { email: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/users/me");
  assertEquals(out.email, "tesla@streak.com");
});

Deno.test("user-get-current: is safe to invoke with no params, as a health probe must be", () => {
  assertEquals(userGetCurrent.params, []);
  assertEquals(userGetCurrent.type, "read");
});
