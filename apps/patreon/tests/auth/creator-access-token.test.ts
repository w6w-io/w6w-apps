import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/creator-access-token.ts";

Deno.test("creator-access-token: declares a required secret field", () => {
  assertEquals(auth.key, "creator-access-token");
  assertEquals(auth.type, "bearer");
  assertEquals(auth.fields?.length, 1);
  assertEquals(auth.fields?.[0].type, "secret");
  assertEquals(auth.fields?.[0].required, true);
});

Deno.test("creator-access-token: sign appends Bearer apiKey", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "creator-token-123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer creator-token-123");
});

Deno.test("creator-access-token: test with missing apiKey reports the failure without a request", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("creator-access-token: test issues GET /identity with Bearer token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "u1", type: "user" } } }]);
  const result = await auth.test({ credential: { apiKey: "creator-token-123" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/api/oauth2/v2/identity");
  assertEquals(calls[0].headers["authorization"], "Bearer creator-token-123");
});

Deno.test("creator-access-token: test classifies failure from the JSON:API error body", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errors: [{ status: "401", title: "Unauthorized", detail: "Invalid access token" }] },
  }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("Invalid access token"));
});

Deno.test("creator-access-token: test never echoes the credential back in its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: [{ title: "Unauthorized" }] } }]);
  const result = await auth.test({ credential: { apiKey: "super-secret-token" } }, ctx);
  assert(!(result.message ?? "").includes("super-secret-token"));
});

Deno.test("creator-access-token: afterConnect extracts { id, full_name, email }", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      data: {
        id: "u9",
        type: "user",
        attributes: { full_name: "Grace", email: "grace@example.com" },
      },
    },
  }]);
  const out = await auth.afterConnect!({ credential: { apiKey: "x" } }, ctx);
  assertEquals(out, { user: { id: "u9", full_name: "Grace", email: "grace@example.com" } });
});
