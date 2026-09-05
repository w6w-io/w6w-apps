import { assertEquals } from "@std/assert";
import personalAccessToken from "../../auth/personal-access-token.ts";
import { mockCtx, pathOf, singularErrorBody } from "../_helpers.ts";
import type { SignableRequest } from "@w6w/types";

Deno.test("personal-access-token: sign injects the bearer header", async () => {
  const { ctx } = mockCtx();
  const request: SignableRequest = {
    url: "https://www.meistertask.com/api/projects",
    method: "GET",
    headers: {},
  };
  const signed = await personalAccessToken.sign!({ request, credential: { token: "abc123" } }, ctx);
  assertEquals(signed.headers["authorization"], "Bearer abc123");
});

Deno.test("personal-access-token: test() probes GET /persons/me and passes on 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 8, firstname: "Jane" } }]);
  const result = await personalAccessToken.test({ credential: { token: "abc123" } }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/persons/me");
  assertEquals(calls[0].headers["authorization"], "Bearer abc123");
  assertEquals(result, { ok: true });
});

Deno.test("personal-access-token: test() reports a 401 as a rejected token, not an outage", async () => {
  const { ctx } = mockCtx([{ status: 401, body: singularErrorBody(401, "Invalid credentials") }]);
  const result = await personalAccessToken.test({ credential: { token: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("401"), true);
});

Deno.test("personal-access-token: test() fails fast when the credential is missing", async () => {
  const { ctx, calls } = mockCtx();
  const result = await personalAccessToken.test({ credential: {} }, ctx);
  assertEquals(result, { ok: false, message: "credential missing token" });
  assertEquals(calls.length, 0);
});

Deno.test("personal-access-token: afterConnect publishes name/email, never the token", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: { id: 8, firstname: "Jane", lastname: "Demo", email: "jane@example.com" },
    },
  ]);
  const out = await personalAccessToken.afterConnect!({ credential: { token: "abc123" } }, ctx);
  assertEquals(out, { id: 8, firstname: "Jane", lastname: "Demo", email: "jane@example.com" });
  assertEquals(JSON.stringify(out).includes("abc123"), false);
});

Deno.test("personal-access-token: afterConnect fails silently on a bad response", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const out = await personalAccessToken.afterConnect!({ credential: { token: "abc123" } }, ctx);
  assertEquals(out, {});
});
