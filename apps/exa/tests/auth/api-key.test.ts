import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is an apiKey method exposing an `apiKey` secret field", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "x-api-key" });
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign sets x-api-key using credential.apiKey, no prefix", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "key-abc" } }, ctx);
  assertEquals(out.headers["x-api-key"], "key-abc");
});

Deno.test("api-key: test hits GET /v0/teams/me (never a billed search/answer/contents call)", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { object: "team", id: "t_1", name: "Acme", concurrency: {}, limits: {} } },
  ]);
  const result = await auth.test({ credential: { apiKey: "key-abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.exa.ai");
  assertEquals(url.pathname, "/v0/teams/me");
  assertEquals(calls[0].headers["x-api-key"], "key-abc");
});

Deno.test("api-key: test never echoes the credential back in its response body", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { object: "team", id: "t_1", name: "Acme", concurrency: {}, limits: {} } },
  ]);
  const result = await auth.test({ credential: { apiKey: "super-secret-key" } }, ctx);
  // The team-info body used above carries no credential material at all —
  // asserting that stays true even if a future field were added by accident.
  assertEquals(JSON.stringify(result).includes("super-secret-key"), false);
});

Deno.test("api-key: test classifies failure from the response body's tag, not the status alone", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { requestId: "r1", error: "Invalid API key", tag: "INVALID_API_KEY" } },
  ]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("INVALID_API_KEY"));
});
