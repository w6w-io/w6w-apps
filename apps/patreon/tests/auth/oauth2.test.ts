import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares the Patreon authorize/token endpoints, no PKCE", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://www.patreon.com/oauth2/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://www.patreon.com/api/oauth2/token");
  assertEquals(auth.oauth2?.pkce, false);
  assert(auth.oauth2?.scopes?.includes("identity"));
  assert(auth.oauth2?.scopes?.includes("campaigns.members"));
});

Deno.test("oauth2: sign appends Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "acc-123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-123");
});

Deno.test("oauth2: test with missing accessToken reports the failure without a request", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test issues GET /identity with Bearer token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "u1", type: "user" } } }]);
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/api/oauth2/v2/identity");
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
});

Deno.test("oauth2: test classifies failure from the JSON:API error body, not just the status", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errors: [{ status: "401", title: "Unauthorized", detail: "Invalid access token" }] },
  }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("Invalid access token"));
});

Deno.test("oauth2: test never echoes the credential back in its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: [{ title: "Unauthorized" }] } }]);
  const result = await auth.test({ credential: { accessToken: "super-secret-token" } }, ctx);
  assert(!(result.message ?? "").includes("super-secret-token"));
});

Deno.test("oauth2: afterConnect extracts { id, full_name, email } from the JSON:API attributes", async () => {
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
  const out = await auth.afterConnect!({ credential: { accessToken: "x" } }, ctx);
  assertEquals(out, { user: { id: "u9", full_name: "Grace", email: "grace@example.com" } });
});

Deno.test("oauth2: afterConnect returns {} when identity fetch fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "x" } }, ctx);
  assertEquals(out, {});
});
