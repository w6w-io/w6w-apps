import { assert, assertEquals } from "@std/assert";
import apiToken, { authHeaders } from "../../auth/api-token.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("api-token: authHeaders builds a Bearer header", () => {
  assertEquals(authHeaders({ apiToken: "missive_pat-abc" }), {
    authorization: "Bearer missive_pat-abc",
  });
});

Deno.test("api-token: sign injects the bearer header without touching the network", () => {
  const request = { headers: {} as Record<string, string>, url: "https://x", method: "GET" };
  const out = apiToken.sign!(
    { request, credential: { apiToken: "missive_pat-abc" } } as never,
    {} as never,
  );
  assertEquals((out as typeof request).headers.authorization, "Bearer missive_pat-abc");
});

Deno.test("api-token: test() probes /organizations, not /users", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { organizations: [] } }]);
  const result = await apiToken.test({ credential: { apiToken: "missive_pat-good" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/organizations");
  assertEquals(calls[0].headers.authorization, "Bearer missive_pat-good");
});

Deno.test("api-token: test() fails without leaking the credential in the message", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("Authentication token is invalid or has been revoked") },
  ]);
  const result = await apiToken.test({ credential: { apiToken: "missive_pat-bad-secret" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("Authentication token is invalid"));
  assert(!result.message?.includes("missive_pat-bad-secret"), "credential leaked into message");
});

Deno.test("api-token: test() rejects a missing credential without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-token: test() reports a non-401 status distinctly", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await apiToken.test({ credential: { apiToken: "missive_pat-x" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("500"));
});

Deno.test("api-token: no fields hold anything but a secret", () => {
  for (const f of apiToken.fields ?? []) {
    assertEquals(f.type, "secret");
  }
});
