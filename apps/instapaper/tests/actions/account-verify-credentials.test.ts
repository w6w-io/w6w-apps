import { assertEquals, assertRejects } from "@std/assert";
import accountVerifyCredentials from "../../actions/account-verify-credentials.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-verify-credentials: returns the authenticated user", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([{ type: "user", user_id: 1, username: "a" }]),
  }]);
  const result = await accountVerifyCredentials.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api/1/account/verify_credentials");
  assertEquals(result, { type: "user", user_id: 1, username: "a" });
});

Deno.test("account-verify-credentials: throws if Instapaper returns no user", async () => {
  const { ctx } = mockCtx([{ body: envelope([]) }]);
  await assertRejects(
    async () => await accountVerifyCredentials.execute({}, ctx),
    Error,
    "no user",
  );
});

Deno.test("account-verify-credentials: is a read action, distinct from the Auth test hook", () => {
  assertEquals(accountVerifyCredentials.type, "read");
  assertEquals(accountVerifyCredentials.key, "account-verify-credentials");
});
