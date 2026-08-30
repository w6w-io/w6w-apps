import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import fullAccessToken from "../../auth/full-access-token.ts";

Deno.test("full-access-token: is a bearer type with a single required secret field", () => {
  assertEquals(fullAccessToken.type, "bearer");
  assertEquals(fullAccessToken.fields?.length, 1);
  assertEquals(fullAccessToken.fields?.[0].type, "secret");
  assertEquals(fullAccessToken.fields?.[0].required, true);
});

Deno.test("full-access-token.sign: stamps Authorization", async () => {
  const { ctx } = mockCtx([]);
  const request = { headers: {} as Record<string, string>, url: "x", method: "POST" };
  const signed = await fullAccessToken.sign!({ request, credential: { token: "full-tok" } }, ctx);
  assertEquals(signed.headers["authorization"], "Bearer full-tok");
});

Deno.test("full-access-token.test: succeeds on a well-formed user response", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { user: { id: "u1", defaultEmail: "a@b.com" } } },
  }]);
  const result = await fullAccessToken.test!({ credential: { token: "tok" } } as never, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("full-access-token.test: fails without throwing when credential is missing token", async () => {
  const { ctx } = mockCtx([]);
  const result = await fullAccessToken.test!({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
});

Deno.test("full-access-token.test: an HTTP-200 UNAUTHENTICATED errors[] is a failure", async () => {
  const { ctx } = mockCtx([{
    body: {
      errors: [{ message: "Login required.", extensions: { code: "UNAUTHENTICATED" } }],
      data: { user: null },
    },
  }]);
  const result = await fullAccessToken.test!({ credential: { token: "bad" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("Login required"));
});
