import { assertEquals } from "@std/assert";
import userProfileGet from "../../actions/user-profile-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-profile-get: GETs /users/api_profile with no query by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", email: "a@b.com" } }]);
  const out = await userProfileGet.execute({}, ctx) as { profile: { email: string } };
  assertEquals(pathOf(calls[0].url), "/api/v1/users/api_profile");
  assertEquals(calls[0].url.includes("?"), false);
  assertEquals(out.profile.email, "a@b.com");
});

Deno.test("user-profile-get: sets include_credit_usage only when explicitly requested", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1" } }]);
  await userProfileGet.execute({ include_credit_usage: true }, ctx);
  assertEquals(queryOf(calls[0].url).include_credit_usage, "true");
});
