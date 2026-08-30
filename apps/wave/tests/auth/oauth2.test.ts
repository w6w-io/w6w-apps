import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import oauth2 from "../../auth/oauth2.ts";

Deno.test("oauth2: declares the documented endpoints and PKCE", () => {
  assertEquals(oauth2.type, "oauth2");
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://api.waveapps.com/oauth2/authorize/");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://api.waveapps.com/oauth2/token/");
  assertEquals(oauth2.oauth2?.revokeUrl, "https://api.waveapps.com/oauth2/token-revoke/");
  assertEquals(oauth2.oauth2?.pkce, true);
});

Deno.test("oauth2: requests only resource:operation scopes, never a bare resource", () => {
  for (const scope of oauth2.oauth2?.scopes ?? []) {
    assert(/^[a-z_]+:(read|write|send|\*)$/.test(scope), `bad scope shape: ${scope}`);
  }
});

Deno.test("oauth2.sign: stamps Authorization and never calls the network", async () => {
  const { ctx } = mockCtx([]);
  const request = { headers: {} as Record<string, string>, url: "x", method: "POST" };
  const signed = await oauth2.sign!({ request, credential: { accessToken: "tok123" } }, ctx);
  assertEquals(signed.headers["authorization"], "Bearer tok123");
});

Deno.test("oauth2.test: succeeds on a well-formed user response", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { user: { id: "u1", defaultEmail: "a@b.com" } } },
  }]);
  const result = await oauth2.test!({ credential: { accessToken: "tok" } } as never, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("oauth2.test: fails without throwing when credential is missing accessToken", async () => {
  const { ctx } = mockCtx([]);
  const result = await oauth2.test!({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
});

Deno.test("oauth2.test: an HTTP-200 UNAUTHENTICATED errors[] is a failure, not a pass", async () => {
  const { ctx } = mockCtx([{
    body: {
      errors: [{ message: "Login required.", extensions: { code: "UNAUTHENTICATED" } }],
      data: { user: null },
    },
  }]);
  const result = await oauth2.test!({ credential: { accessToken: "expired" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("Login required"));
});

Deno.test("oauth2.test: a non-2xx without errors[] is a failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  const result = await oauth2.test!({ credential: { accessToken: "bad" } } as never, ctx);
  assertEquals(result.ok, false);
});

Deno.test("oauth2.afterConnect: stores the user for the connection label template", async () => {
  const { ctx } = mockCtx([{
    body: { data: { user: { id: "u1", firstName: "A", lastName: "B", defaultEmail: "a@b.com" } } },
  }]);
  const result = await oauth2.afterConnect!({} as never, ctx);
  assertEquals((result as { user: { defaultEmail: string } }).user.defaultEmail, "a@b.com");
});

Deno.test("oauth2.afterConnect: returns {} on failure rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const result = await oauth2.afterConnect!({} as never, ctx);
  assertEquals(result, {});
});

Deno.test("oauth2: connectionLabel references the field afterConnect stores", () => {
  assertEquals(oauth2.connectionLabel, "{{user.defaultEmail}}");
});
