import { assertEquals } from "@std/assert";
import userGetMe from "../../actions/user-get-me.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-get-me: calls GET /v1/users/me with no parameters", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "u1", name: "Ada", email: "ada@example.com" } },
  ]);
  const out = await userGetMe.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/users/me");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, { id: "u1", name: "Ada", email: "ada@example.com" });
  assertEquals(userGetMe.params, []);
});

/**
 * No `Authorization`, no `X-API-Key`: an action never sees the credential, and
 * the runtime routes the request through the auth `sign` hook instead.
 */
Deno.test("user-get-me: the action sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1" } }]);
  await userGetMe.execute({}, ctx);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers.accept, "application/json");
});
