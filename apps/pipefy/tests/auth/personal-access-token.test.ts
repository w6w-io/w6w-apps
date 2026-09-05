import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import personalAccessToken from "../../auth/personal-access-token.ts";

Deno.test("personal-access-token: is a bearer type with a single required secret field", () => {
  assertEquals(personalAccessToken.type, "bearer");
  assertEquals(personalAccessToken.fields?.length, 1);
  assertEquals(personalAccessToken.fields?.[0].type, "secret");
  assertEquals(personalAccessToken.fields?.[0].required, true);
});

Deno.test("personal-access-token.sign: stamps Authorization", async () => {
  const { ctx } = mockCtx([]);
  const request = { headers: {} as Record<string, string>, url: "x", method: "POST" };
  const signed = await personalAccessToken.sign!(
    { request, credential: { token: "pat-1" } },
    ctx,
  );
  assertEquals(signed.headers["authorization"], "Bearer pat-1");
});

Deno.test("personal-access-token.test: succeeds on a well-formed `me` response", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { me: { id: "u1" } } } }]);
  const result = await personalAccessToken.test!({ credential: { token: "tok" } } as never, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("personal-access-token.test: fails without throwing when credential is missing token", async () => {
  const result = await personalAccessToken.test!({ credential: {} } as never, mockCtx([]).ctx);
  assertEquals(result.ok, false);
});

Deno.test("personal-access-token.test: the REST-flavored unauthorized envelope is a failure", async () => {
  const { ctx } = mockCtx([{
    body: {
      errors: [{ title: "Unauthorized", detail: "You are not authorized to access this page" }],
    },
  }]);
  const result = await personalAccessToken.test!({ credential: { token: "bad" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("Unauthorized"));
});

Deno.test("personal-access-token.test: the OAuth2-flavored invalid_token envelope is a failure", async () => {
  const { ctx } = mockCtx([{
    body: { error: "invalid_token", error_description: "The access token is invalid" },
  }]);
  const result = await personalAccessToken.test!({ credential: { token: "bad" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("The access token is invalid"));
});
